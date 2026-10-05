# Architecture

How `hash` is layered, and the contract an integration implements. Read this before adding a
component, a device kind, or an integration.

> **Status.** This describes the **target** design. Parts of it are not built yet; each section
> says what exists **today** and what is **planned**, and the table at the end tracks migration.
> When code and this document disagree about the target, fix the code or change this document —
> don't leave them apart.

## Principles

1. **The UI knows nothing about integrations.** `@hash/ui` components care about state and
   interactions only. They never name Home Assistant, Music Assistant, a service, or an
   integration-specific attribute.
2. **Integrations translate.** Each integration maps its backend's shape to a generic entity
   model, and maps generic commands back to its backend. The translation lives in the integration
   package, runs on the server, and is the only place that knows the backend.
3. **Using a component stays one prop.** Cards take an entity id; the generic object is resolved
   for them. The object form exists for custom sources, not as the default.
4. **Integrations are ordinary npm packages.** Anyone can publish one by implementing the contract
   in `@hash/core`. Nothing in `@hash/core`, `@hash/ui` or `@hash/runtime` special-cases an
   integration.
5. **A project is an app, not a configuration.** Dashboards are ordinary React code that composes
   `@hash/ui` components. The framework provides components, a hosting runtime and integrations.

## Layers

```
 backend            integration (npm package)        @hash/core                @hash/ui
 ───────            ─────────────────────────        ──────────                ────────
 Home Assistant ──► maps its entities to the   ──►  generic entity model ──►  hook(ref) → object → component
 Music Assistant    generic model; maps             named commands
 anything else      generic commands back           wire protocol
                    (server only)                   integration contract
                                    ▲                        ▲
                                    └──── @hash/runtime ─────┘
                                     hosts integrations, proxies them to the browser
```

| Package               | Owns                                                                                           | Must not                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `@hash/core`          | Entity refs, the generic model, commands, the integration contract, the wire protocol, clients | Depend on React, or name any backend                           |
| integration packages  | Connecting to one backend; translating state and commands                                      | Be imported by browser code; depend on `@hash/ui`              |
| `@hash/runtime`       | The CLI, hosting integrations, the browser proxy, route helpers                                | Know about any specific integration or render any UI chrome    |
| `@hash/ui`            | Design system, hooks, components                                                               | Name an integration, a backend service, or a backend attribute |
| a project (`example`) | `hash.config.ts` (which integrations), its dashboards, its shared files                        | —                                                              |

## Entity refs

An entity is addressed by `<integration>:<id>`, for example `ha:light.kitchen` or
`ma:living_room`.

- `<integration>` is the `id` of the integration that owns the entity. Ids are unique per project;
  the runtime refuses to start if two integrations claim the same one.
- `<id>` is opaque to everything except the owning integration. It may contain dots or colons.
  Nothing outside the integration may parse it (no "the part before the dot is the domain").
- A ref is an address, not a coupling: `ha:` says who answers for the entity, not what shape it has.

**Status:** built (`packages/core/src/entity.ts`).

## The generic entity model

Every entity an integration exposes is one object of a known **kind**.

```ts
interface EntityBase<K extends string = string> {
  /** `<integration>:<id>`. */
  ref: EntityRef;
  /** What this entity is; selects the model and the commands. */
  kind: K;
  /** Human-readable name, already resolved by the integration. */
  name: string;
  /** `ready`: state is meaningful. `unavailable`: the device is unreachable.
   *  `unknown`: reachable but it has not reported yet. */
  availability: 'ready' | 'unavailable' | 'unknown';
  /** ISO 8601. When the state last changed / was last reported. */
  lastChanged?: string;
  lastUpdated?: string;
  /** The backend's own payload, untouched. An escape hatch for project code; see the rules. */
  raw?: Record<string, unknown>;
}
```

"Loading" and "does not exist" are not availabilities: the browser sees `undefined` while it waits
for the first answer and `null` when the integration has no such entity.

### Kinds

Each kind is one file in `@hash/core` holding its state, its **capabilities** and its **commands**.
The first kind, in full:

```ts
interface MediaPlayerEntity extends EntityBase<'mediaPlayer'> {
  playback: 'playing' | 'paused' | 'idle' | 'off' | 'buffering';
  media?: { title?: string; artist?: string; album?: string; artworkUrl?: string };
  /** Seconds into the current item as of `positionUpdatedAt` (ISO); a UI advances it itself while playing. */
  position?: number;
  duration?: number;
  positionUpdatedAt?: string;
  /** Plays its queue in a random order. Absent when the player has no shuffle. */
  shuffle?: boolean;
  /** 0..1. Absent when the player has no volume control. */
  volume?: number;
  muted: boolean;
  capabilities: {
    volume: boolean;
    mute: boolean;
    next: boolean;
    previous: boolean;
    /** Has a browsable library (see `Integration.browse`). */
    browse: boolean;
    /** The library can be searched. */
    search: boolean;
    /** Playback can be moved to a position. */
    seek: boolean;
    /** Shuffle can be turned on and off. */
    shuffle: boolean;
    /** Playback can be moved to another player. */
    transfer: boolean;
    /** Can be grouped with other players. */
    group: boolean;
  };
}

interface MediaPlayerCommands {
  play: void;
  pause: void;
  togglePlay: void;
  next: void;
  previous: void;
  setVolume: { volume: number }; // 0..1
  setMuted: { muted: boolean };
  seek: { position: number }; // seconds
  setShuffle: { shuffle: boolean };
  /** Plays a `BrowseItem` of this player's own library; `mode` queues it instead (`next`, `add`). */
  playMedia: { item: string; mode?: 'play' | 'replace' | 'next' | 'add' };
}
```

Planned kinds, finalized when each is migrated: `light` (on, brightness 0..1, color temperature in
kelvin with its range, color as hue/saturation; capabilities for each), `climate` (mode from a
closed set, target and current temperature, step and range, presets), `sensor` (numeric or text
value, unit, measurement class), `action` (a one-shot thing to trigger: scene, script, button).
Anything else is `kind: 'generic'` with a text `value`.

### Model rules

- **Normalized units.** Fractions are 0..1 (brightness, volume). Color temperature is kelvin.
  Temperatures carry their unit. Never a backend's native scale (0–255, 0–100).
- **Capabilities, not mode lists.** A component asks "can this light do color temperature?" by
  reading `capabilities`, never by interpreting a backend's mode strings.
- **Closed vocabularies.** Enumerations (`playback`, climate modes) are fixed sets defined in
  `@hash/core`. An integration maps its values onto them; a value with no equivalent maps to the
  nearest one, and the original stays in `raw`.
- **Nothing backend-named.** No field or command name comes from a backend's API.
- **`raw` is for projects, not for `@hash/ui`.** A dashboard may read `raw` for something the model
  does not cover. A `@hash/ui` component must not. If a component needs a field, the field belongs
  in the model.
- **`raw` reaches the browser.** It must never contain credentials or anything not meant for the
  person looking at the dashboard.
- **Additive evolution.** New fields and capabilities are optional. Removing or changing one is a
  breaking change to `@hash/core`.

### Custom kinds

`kind` is an open string, so a third-party integration can ship its own kind together with the
component that renders it, without changing `@hash/core`. Unprefixed kind names are reserved for
`@hash/core`; a third-party kind uses a prefix (`acme.blind`).

**Status:** built (`packages/core/src/model/`): `mediaPlayer`, `light`, `climate`, `sensor`, `switch`,
`action`, `person` and `generic`.

## The integration contract

An integration is a class that implements `Integration`. This is the whole surface a third-party
package has to provide.

```ts
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
type Unsubscribe = () => void;

interface Integration {
  // ── identity ────────────────────────────────────────────────────────────
  readonly id: string;

  // ── connection ──────────────────────────────────────────────────────────
  readonly status: ConnectionStatus;
  connect(): Promise<void>;
  disconnect(): void;
  onStatusChange(listener: (status: ConnectionStatus) => void): Unsubscribe;

  // ── entities ────────────────────────────────────────────────────────────
  listEntities(): Entity[];
  getEntity(entityId: string): Entity | undefined;
  subscribe(entityId: string, listener: (entity: Entity | undefined) => void): Unsubscribe;

  // ── commands ────────────────────────────────────────────────────────────
  command(entityId: string, name: string, args?: Record<string, unknown>): Promise<void>;

  // ── optional capabilities ───────────────────────────────────────────────
  history?(entityId: string, query: HistoryQuery): Promise<HistorySample[]>;
  logbook?(entityId: string, query: LogbookQuery): Promise<LogbookEntry[]>;
  browse?(entityId: string, query: { path?: string; search?: string }): Promise<BrowseResult>;

  // ── escape hatch ────────────────────────────────────────────────────────
  callRaw?(request: Record<string, unknown>): Promise<unknown>;
}
```

**Integrations never see a ref.** Every `entityId` an integration receives is its own local id.
`@hash/core` and the runtime do the addressing in one place: they parse `<integration>:<id>`, pick
the integration by its `id`, and pass on only the local id. In the other direction the integration
hands over entities keyed by local id, and `BaseIntegration` stamps `ref` onto them. An integration
neither strips nor builds prefixes.

### Identity

- **`id`** — the prefix of every ref the integration owns. It has a short default (`ha`, `ma`) and
  must be overridable through the integration's options, so a project can run two instances of the
  same integration (`ha` and `ha-cabin`). It is fixed for the lifetime of the instance.

### Connection

- **`connect()`** resolves once the integration is authenticated **and** has loaded its first full
  set of entities, so `listEntities()` is complete when it resolves. It rejects if that first
  attempt fails. It is idempotent: calling it while connected or connecting does not open a second
  connection.
- **Who retries.** The runtime calls `connect()` once at startup and, if it rejects, retries with
  exponential backoff (1s up to 30s) forever; a backend being down never stops the server. After
  the first success the **integration** owns reconnection: when the link drops it reconnects by
  itself with backoff, and the runtime does not call `connect()` again.
- **`disconnect()`** is synchronous and idempotent. It closes the link, cancels reconnect timers,
  rejects in-flight commands, and sets the status to `disconnected`. The instance may be
  `connect()`ed again afterwards.
- **`status`** and **`onStatusChange`**:

  | Status         | Meaning                                                                                                                       |
  | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
  | `disconnected` | Not connected and not trying (initial state, or after `disconnect()`, or a dropped link before the reconnect attempt starts). |
  | `connecting`   | A connection attempt is in progress.                                                                                          |
  | `connected`    | Authenticated; entities are live.                                                                                             |
  | `error`        | The last attempt failed (bad token, unreachable host).                                                                        |

  Listeners are called only when the status actually changes. The current value is read from
  `status`, not delivered on subscribe. The browser shows this status per integration.

- **While not connected**, the integration keeps its last known entities and marks them
  `availability: 'unavailable'`, so a dashboard dims instead of going blank.

### Entities

- **`listEntities()`** returns every entity currently known. It is used for discovery (finding
  entity ids, generating typed refs) and for choosers (a speaker selector). It is synchronous and
  reads the integration's in-memory store.
- **`getEntity(id)`** returns the current entity, or `undefined` if the integration has no entity
  with that id.
- **`subscribe(id, listener)`**:
  - **throws `UnknownEntityError`** if the integration has no entity with that id. Subscribing to
    something that does not exist is a mistake (a typo, a removed device), and it is reported as
    one instead of waiting silently for the entity to appear;
  - otherwise calls `listener` **immediately and synchronously** with the current entity;
  - calls it again on every change, and with `undefined` if the entity is later removed;
  - returns an `Unsubscribe` that is safe to call more than once.

  "Does not exist" can only be decided once the integration knows its entities, so the runtime
  subscribes only after `connect()` has resolved (see the wire protocol). An integration is never
  asked about an id before it has its first full set. A consequence: a device added to the backend
  later is picked up by new subscriptions (a page that loads afterwards), not by one that already
  failed.

- **Identity and immutability.** An emitted entity object is never mutated afterwards. A new object
  is emitted only when something changed; an unchanged entity keeps its object identity across
  backend refreshes. React rendering relies on this.
- **Translation happens here.** The entity an integration stores is already the generic model.
  Mapping is a pure function from the backend's payload to an entity (everything but `ref`, which
  the base class adds), kept in its own module per kind so it can be unit-tested without a
  connection.

### Commands

- **`command(id, name, args)`** performs a named command from the entity's kind (`setVolume`,
  `next`) and resolves once the backend has **accepted** it. It does not wait for the resulting
  state change; that arrives through `subscribe`.
- It rejects with an `Error` whose message can be shown to a person: unknown entity, a command the
  kind does not define, a command this entity's capabilities do not allow, invalid arguments, not
  connected, or the backend refusing. The message crosses to the browser, so it must not contain
  secrets.
- **Arguments are untrusted.** They originate in a browser. The integration validates them (types,
  ranges) before touching the backend.
- **Normalized in, native out.** `setVolume { volume: 0.4 }` arrives as a fraction; the integration
  converts it to whatever the backend wants.
- No optimistic state. The integration reports what the backend reports. Components that want an
  instant response keep their own pending value until the real state catches up.

### Optional capabilities

An integration implements only what its backend can do. A missing method means "not supported" and
the UI hides the feature.

- **`history(id, { from, to, resolution? })`** → timestamped numeric samples, oldest first. Feeds
  charts and min / max / usage totals.
- **`logbook(id, { limit? })`** → recent activity entries (what changed, who or what caused it,
  when), newest first.
- **`browse(id, { path?, search? })`** → one level of a player's media library, or a search of it, as
  `BrowseItem`s (`id`, `title`, `subtitle?`, `artworkUrl?`, `kind`, `playable`, `expandable`). The
  item `id` is opaque: it goes back to `browse` as `path` to open it, or to `playMedia` to play it.
  **One source per player:** the integration that owns the player is the media source (a `ma:`
  player lists Music Assistant's library, an `ha:` player Home Assistant's), never a mix. Music
  Assistant maps shelves (recently played, playlists, albums, artists, radio) onto its library
  commands and supports search; Home Assistant passes `media_player/browse_media` through, whose
  content depends on the player, and has no search. Artwork is passed on only when the browser can
  open it without a login; a runtime image proxy for the rest is planned.
  A top level that is nothing but folders to open (two or more) is a set of shelves, and the UI shows
  it as tabs that open on the first shelf instead of a list; any other top level is a plain list.

Each of these should also be advertised per entity through a capability flag where a kind has one
(`MediaPlayerEntity.capabilities.browse`), so a component can decide without calling.

### Escape hatch

- **`callRaw(request)`** passes a backend-specific request through (a Home Assistant service call
  that no command covers). It exists so a project is never blocked by the model. `@hash/ui` never
  calls it. If something is needed often, it becomes a command.

### `BaseIntegration`

`@hash/core` ships an abstract class that implements the bookkeeping, so an integration only writes
the backend-specific parts.

```ts
abstract class BaseIntegration implements Integration {
  abstract readonly id: string;
  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract command(entityId: string, name: string, args?: Record<string, unknown>): Promise<void>;

  // provided
  get status(): ConnectionStatus;
  onStatusChange(listener): Unsubscribe;
  listEntities(): Entity[];
  getEntity(entityId: string): Entity | undefined;
  subscribe(entityId: string, listener): Unsubscribe;

  // for subclasses
  protected setStatus(status: ConnectionStatus): void;
  protected setEntity(entityId: string, entity: EntityInput | undefined): void;
  protected replaceEntities(next: Map<string, EntityInput>): void;
}

/** An entity as an integration produces it: the model without `ref`. */
type EntityInput = Omit<Entity, 'ref'>;
```

- `setStatus` notifies listeners only on a real change.
- `setEntity` stores (or removes, with `undefined`) one entity, stamps its `ref` from the
  integration's `id` and the local id, and notifies its subscribers.
- `subscribe` throws `UnknownEntityError` for an id that is not in the store.
- `replaceEntities` swaps the whole store and notifies only for ids whose object identity changed,
  which is why an integration must reuse the previous object for an unchanged entity.

A subclass therefore has three jobs: manage the connection and call `setStatus`; map backend
updates to entities and call `setEntity` / `replaceEntities`; translate `command`.

### Packaging an integration

- **A normal npm package**, ESM, with `@hash/core` as a `peerDependency`. Suggested name:
  `hash-integration-<backend>` (or scoped).
- **Server only.** It is constructed in `hash.config.ts`, which the runtime loads in Node. It is
  never bundled for the browser, so it may use Node APIs and hold credentials. It must not import
  `@hash/ui` or React.
- **Exports** the integration class and its options type. Options include the connection details,
  an optional `id`, and a seam to replace the transport in tests (a `createClient` or
  `createSocket` function).
- **A mock, at `./mock`.** The package's `exports` has a `./mock` entry whose `createMock(options?)`
  returns a `MockIntegration` (from `@hash/core`) with the integration's own default `id` and a
  representative set of devices: every kind it can produce, and the states a dashboard has to
  handle, including an unavailable device. Build the fixtures from the backend's raw payloads and
  run them through the integration's real mapper, so the mock cannot drift from it. This lets a
  project, a test or the gallery try any device without a backend.
- **Registration** is the only wiring:

  ```ts
  // hash.config.ts
  import { defineConfig } from '@hash/runtime';
  import { AcmeIntegration } from 'hash-integration-acme';

  export default defineConfig({
    integrations: [
      new AcmeIntegration({ url: process.env.ACME_URL!, token: process.env.ACME_TOKEN! }),
    ],
  });
  ```

- **Credentials** stay in the integration. They are read from the project's environment and never
  appear in an entity, an error message, or `raw`.

### What a conforming integration guarantees

A checklist for authors. Items 10 and 11 are enforced today (see below); the rest are not yet.

1. `id` is stable and overridable. The integration works only in local ids and never builds or
   parses a ref.
2. `connect()` resolves only after the first full entity set is loaded; rejects on first-attempt
   failure; is idempotent.
3. After a first success it reconnects by itself; while disconnected, entities stay listed and are
   `unavailable`.
4. `disconnect()` is synchronous, idempotent, and leaves no timers or sockets.
5. `subscribe` throws for an unknown id; otherwise it delivers the current value synchronously,
   then every change, then `undefined` on removal.
6. Unchanged entities keep their object identity; emitted objects are never mutated.
7. Every entity is a valid model object for its `kind`, with normalized units and truthful
   capabilities.
8. `command` validates its arguments, rejects with a displayable message, and never reports state
   the backend did not report.
9. No credentials leave the integration.
10. The package exports a mock at `./mock` (`createMock`) that covers every kind it can produce.
11. The package runs the shared conformance suite against that mock.

**Enforced.** `@hash/core/conformance` exports `runIntegrationConformance({ name, defaultId, kinds,
createMock })`, which an integration calls from a test in `src/__tests__/`. It checks the mock's
default id, that it connects and covers every declared kind, that every entity is valid and
addressed by this integration, that there is an unavailable device, `subscribe` semantics, that
every command of every kind runs and bad commands reject, and that no credentials appear.
`packages/integrations/mock-contract.test.ts` fails for any integration package that lacks the
`./mock` export or does not call the suite, so a new integration cannot skip either.

**Status:** built. `Integration`, `BaseIntegration`, the mock integration and `UnknownEntityError` live in
`packages/core/src`; the runtime strips the prefix and defers subscriptions until an integration is
connected. `browse` is built (below); `history` and `logbook` are not. The mock conformance suite is (below).

## Wire protocol

The browser never talks to a backend. It talks to the runtime over one WebSocket (`/ws`), and the
runtime talks to the integrations.

Browser → runtime:

| Message                                        | Meaning                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `{ type: 'subscribe', ref }` / `'unsubscribe'` | Start / stop receiving an entity                                 |
| `{ type: 'command', id, ref, command, args? }` | Run a command; answered by `result`                              |
| `{ type: 'query', id, ref, query, args? }`     | `history` / `logbook` / `browse`; answered by `result` with data |
| `{ type: 'raw', id, integration, request }`    | The escape hatch                                                 |

Runtime → browser:

| Message                                                            | Meaning                                        |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| `{ type: 'entity', ref, entity }`                                  | Current entity; `null` means it does not exist |
| `{ type: 'status', integration, status }`                          | An integration's connection status             |
| `{ type: 'result', id, ok: true, data? }` / `{ ok: false, error }` | Outcome of a command, query or raw request     |

Every browser message is validated before it reaches an integration, and the runtime does all the
addressing: it parses the ref, finds the integration by its prefix and passes on the local id.

A subscription is resolved once the owning integration is connected. Until then the browser has no
answer and the component shows its loading state. Then:

- the entity exists: the runtime sends it, and every later change;
- the integration does not have it (`UnknownEntityError`), or no integration owns the prefix: the
  runtime sends `entity: null` and logs the ref. The component shows "Not found".

When a browser connects, the runtime replays each integration's status and the current value of
every entity it subscribes to, so a display that wakes up gets a full picture at once.

**Status:** built for `subscribe`, `unsubscribe`, `command`, `raw`, `entity`, `status` and `result`;
`query` carries `browse` today; `history` and `logbook` will join it.

## The UI

Three layers, each with one job:

```
useEntity(ref)            the generic entity, live            Entity | null | undefined
usePlayer(ref)            entity + its commands bound         Player (state + methods)
<MediaPlayerBar … />      renders a Player                    no knowledge of where it came from
```

- **Hooks** resolve a ref. A kind hook (`usePlayer`, `useLight`, `useClimate`) returns one object:
  the entity's state plus methods that send its commands (`player.next()`, `light.setBrightness(0.6)`).
- **Components take an id or an object.**

  ```tsx
  <MediaPlayerBar entity="ma:living_room" />   // the normal form: one prop
  <MediaPlayerBar player={myPlayer} />         // a custom source, a test, the gallery
  ```

  The id form is a thin wrapper that calls the hook and renders the object form. The object form is
  a pure view: no provider entity, no network.

- **Lifecycle is uniform.** Every component handles loading, not found, unavailable and unknown the
  same way. Dashboards never check availability themselves.
- **Rules for `@hash/ui`:** no integration names, no backend service or attribute names, no reads
  of `raw`, no `callRaw`. A guard test will enforce the first three for migrated kinds.

**Status:** built. `useEntity`, `useCommand` and `useEntityHandle` are in `packages/ui/src/hooks.ts`;
cards take `EntityRef | EntityHandle<K>` (`entity-handle.ts`). Kind hooks such as `usePlayer` were
replaced by the handle.

## Adding things

**A kind.** Add its model and command map to `@hash/core`; map it in every integration that has
such devices; teach the mock integration its commands; add the kind hook and the component (id or
object) to `@hash/ui`; add it to the gallery with its props documented; update the status table.

**An integration.** Implement `Integration` (extend `BaseIntegration`); write one pure mapping
module per kind it supports, with unit tests; translate commands; add a transport seam and test
against a fake; export a `./mock` with `createMock()` and run `runIntegrationConformance` on it; register it in a project's `hash.config.ts`. No change to `@hash/core`,
`@hash/runtime` or `@hash/ui` is needed.

## Migration status

Every card kind is on the generic model. HA-shaped `EntityState` and `callService` are gone from
`@hash/core` and `@hash/ui`; Home Assistant's own shape lives only in its integration package.

| Piece                                                                                    | Status                      |
| ---------------------------------------------------------------------------------------- | --------------------------- |
| Generic model in `@hash/core`                                                            | done                        |
| `command` / `raw` on the contract and the wire                                           | done                        |
| Media player (Music Assistant native, Home Assistant mapped)                             | done                        |
| Light, climate, sensor, switch, action / scene, person                                   | done                        |
| `history` / `logbook` (energy totals, sensor history, activity)                          | not started; demo data only |
| `browse` / `search` / `playMedia` / `seek` (Music Assistant, Home Assistant, UI browser) | done                        |
| Queue ("up next", Music Assistant only), image proxy, speaker transfer and grouping      | not started                 |
| Integration mocks and the mock conformance suite                                         | done                        |
| Typed refs per kind                                                                      | not started (optional)      |

## Decisions

- **Versioning.** `@hash/core` follows semver, and its major version is the version of the model and
  of the integration contract. An integration tracks it: an integration at `2.x.x` works with
  `@hash/core` `2.x`. It declares `@hash/core` as a peer dependency on that major (`^2.0.0`), so a
  mismatch is reported at install time. Minor releases of core only add (optional fields, new
  kinds, new optional methods); anything that would break an integration is a major.
- **Rooms and grouping stay in the dashboard.** The model has no areas or rooms, and nothing builds
  a dashboard automatically: a backend exposes far more than anyone wants on a screen. A dashboard
  lists the entities it shows. Discovery tooling (the `entity-discovery` skill) may read a
  backend's own room assignment to _suggest_ a sensible layout, through integration-specific
  helpers that are not part of this contract.
- **Conformance suite.** `@hash/core/conformance` is a shared test helper that an integration runs
  against its own mock. It covers the mock and the model-level checks; the connection-level items
  (reconnect, idempotent `connect`, timers) need a transport fake per integration and are not
  asserted yet.

## Open questions

- **Typed refs per kind.** Optional. Generating types so `<LightTile entity>` only accepts refs of
  kind `light`. Refs are already typed as "known ids" when a project generates them; narrowing by
  kind is a convenience to weigh against the extra codegen.
