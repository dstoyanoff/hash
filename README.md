# hash

[![CI](https://github.com/dstoyanoff/hash/actions/workflows/ci.yml/badge.svg)](https://github.com/dstoyanoff/hash/actions/workflows/ci.yml)

**Your own smart-home dashboards, built like software.** No drag-and-drop card editor — a real
design system, real components, real tests, served from a small Docker container to whatever
screen you point it at (a wall-mounted tablet, a Shelly display, a phone). Home Assistant is the
default backend, but nothing here is tied to it.

The twist: **this repo is built to be extended by an AI coding agent, not just by hand.** Every
dashboard follows a small set of strict rules (see [Agent-first](#agent-first-how-dashboards-get-built)
below), so an agent like Claude Code can be handed "build me a dashboard for the kitchen" and
produce something that fits the design system and renders correctly — without ever touching the
parts of the codebase it shouldn't.

## What's actually in here

```
packages/                                           ─┐
  core/                      @hash/core              │ the published framework: no knowledge of any
  integrations/                                      │ specific home. In a real split, this is what
    home-assistant/          @hash/integration.*      │ you'd `npm install`.
    music-assistant/         @hash/integration.*      │
  ui/                        @hash/ui                 │
  runtime/                   @hash/runtime           ─┘ CLI (hash-dash dev/build/start) + reusable
                                                          pieces (createLayout, ...)
example/                     @hash/example           ─┐ the one real consumer project — everything
  hash.config.ts              (your integrations)     │ here is YOUR project, not the framework.
  shared/                      (conventions dashboards │ `templates/dashboard/` is what a new
                                 reuse: top bar, list)  │ dashboards/<id>/ folder is scaffolded from.
  app/                         (real React Router:    │
                                 root.tsx, routes.ts —  │
                                 every route in one     │
                                 file)                  │
  dashboards/                                         │
    home/                      — reference dashboard  │
    second-floor/               (downstairs/upstairs, │
    kitchen/                    switchable from the   │
    hello/                      top bar)              │
templates/
  dashboard/                 — scaffold for a new example/dashboards/<id>/ folder
```

`packages/*` is the framework: no knowledge of this specific home, nothing project-specific.
Everything under `example/` is a real, ordinary consumer project using that framework — this
repo just happens to host both side by side so `@hash/ui`'s/`@hash/runtime`'s own tests and the
dogfood dashboards live in the same place.

A dashboard is a plain folder under `example/dashboards/<id>/`, but that alone doesn't make it
reachable — it's wired up explicitly, at compile time, by a route in `example/app/routes.ts`, the
one file that lists every route. A dashboard owns its whole layout: it includes the `@hash/ui` top bar and nav itself
(or doesn't), typically through a small shared file such as `example/shared/top-bar.tsx` — a
convention of the example project, not something `@hash` enforces. The `create-dashboard` skill
does all of this for you. Nothing is
auto-discovered — there's no `/` index of installed dashboards; each one lives at
`/<id>`.

## Quickstart

### For a human

```bash
git clone https://github.com/dstoyanoff/hash.git
cd hash
corepack enable        # gets you the right pnpm
pnpm install
pnpm dev
```

Open **http://localhost:3000/home** — the example dashboard, running against fake
("mock") data so there's something to click even without a real smart home connected (the other
examples are at `/second-floor`, `/kitchen`, `/hello`). In a second
terminal, `pnpm --filter @hash/ui docs` serves the component gallery on its own port: every
component in every state (on, off, dimming, unavailable, ...), the same reference an agent uses
when building a page.

Want it talking to your real Home Assistant and/or Music Assistant instead of mock data? They're
independent — set either, both, or neither:

```bash
HA_URL=http://homeassistant.local:8123 HA_TOKEN=<a long-lived access token> \
MA_URL=http://mass.local:8095 MA_TOKEN=<a token from Settings → Profile> \
pnpm dev
```

(Home Assistant → your profile → **Long-Lived Access Tokens** → _Create Token_.) Music Assistant
is talked to directly over its own WebSocket API, not through Home Assistant.

### For your agent

If you're using Claude Code (or another coding agent) and just want this running as fast as
possible, paste this in:

> Clone `https://github.com/dstoyanoff/hash.git`, enable corepack, run `pnpm install`, then run
> `pnpm dev` in the background and open http://localhost:3000/home for me so I can see
> it's working.

Once it's running, the fastest way to get your own dashboard is to just ask for it — the agent
already has everything it needs from the skills in `.claude/skills/`:

> Create a dashboard for my [kitchen / living room / bathroom / whatever]. It's a
> [tablet mounted on the wall / small square Shelly-style display / ...]. Devices: [list your
> lights, thermostats, sensors, scenes — or say you don't have a live Home Assistant yet and it'll
> use realistic placeholder data].

That one request runs the whole `create-dashboard` workflow: scaffolding the dashboard, looking up
real entity ids (or using sensible mock ones), composing the page from the design system, wiring
it into the app, and checking it all actually renders — see
[Agent-first](#agent-first-how-dashboards-get-built).

## Running it for real

Build once on your own machine; nothing is compiled, and no source is copied, where it runs.

```bash
pnpm package helm --platform linux/amd64   # or: compose, plain, image
```

`hash-dash package` builds your dashboards, bundles the server (your `hash.config.ts` and its
integrations included) into one file, and writes what you need to deploy it into `./release`:

| Target    | What you get                                                | Needs                  |
| --------- | ----------------------------------------------------------- | ---------------------- |
| `plain`   | `server.mjs` + `client/`: run it with `node server.mjs`     | Node 24+ where it runs |
| `compose` | a Docker Compose file and the container image (`image.tar`) | Docker where it runs   |
| `helm`    | a Helm chart for k3s/Kubernetes and the image (`image.tar`) | k3s/Kubernetes + helm  |

Pass one or more targets, or set a default in `hash.config.ts` so `pnpm package` takes no flags:

```ts
export default defineConfig({
  integrations: [...],
  package: { targets: ['helm'], platform: 'linux/amd64' },
});
```

Building the image needs Docker on **your** machine (`--platform` builds for a server of another
kind, e.g. an x86 server from an Apple-silicon Mac); `plain` needs none. Each release has its own
image tag, so a server always picks up an update. No registry is involved: copy `release/` to the
server, load `image.tar` (`docker load`, or `k3s ctr images import`, which the chart's
`import-image.sh` does) and start it.

**Secrets are never in the image or the release files.** The config reads `HA_URL`/`HA_TOKEN` and
the like from the environment when it runs: an `.env` file for compose, a Kubernetes Secret for
helm (the chart takes the Secret's name and never holds its values). Leave them unset and the
mock data from `hash.config.ts` is used. Point a tablet's browser (or a kiosk app) at
`http://<the server>:3000/<id>`. Your token lives on the server, never on the tablet.

## Agent-first: how dashboards get built

A dashboard's own files (`example/dashboards/<id>/**`) can only import `react`, `react-router`,
`@hash/ui` and `@hash/core` — enforced by lint, not just convention. That constraint is what makes
it safe to hand dashboard work to an agent: it physically cannot reach into the runtime or the
design system while building one, so "create a dashboard" can never turn into "also refactored the
runtime." If a dashboard genuinely needs something the design system doesn't have yet, that's a
separate, explicit, reviewable change (see the `add-ui-component` skill).

Everything an agent needs to do this well lives in `.claude/skills/`:

| Skill              | What it's for                                                                   |
| ------------------ | ------------------------------------------------------------------------------- |
| `create-dashboard` | The end-to-end process for a new dashboard                                      |
| `dashboard-rules`  | The hard constraints, plus every sharp edge found building the real examples    |
| `entity-discovery` | Finding real Home Assistant entity ids instead of guessing                      |
| `ui-catalog`       | Every component, its props, generated straight from source so it can't go stale |
| `verify-dashboard` | How to actually check the result works before calling it done                   |
| `add-ui-component` | The stricter, separate workflow for extending the design system itself          |

These were refined by actually using them — including a dry run where an agent was handed nothing
but "create a kitchen dashboard" and the resulting friction was fed back into the skills. They're
also just good docs for a human doing the same work by hand.

## Development

How the layers and the integration contract fit together: [ARCHITECTURE.md](ARCHITECTURE.md).

```bash
pnpm lint             # oxlint
pnpm format:check     # oxfmt (pnpm format to fix)
pnpm typecheck
pnpm test             # vitest, every package
pnpm generate:catalog      # regenerate the UI catalog after changing a component
```

Node is pinned (`devEngines.runtime` in `package.json`) and managed by pnpm — no nvm needed;
`corepack enable` gets you the matching pnpm version automatically.

More detail on the layout and rules lives in [`AGENTS.md`](AGENTS.md) (also read by Claude Code as
`CLAUDE.md`).

## Status

Actively under construction — milestones are tracked as
[GitHub issues](https://github.com/dstoyanoff/hash/issues). Not yet published as installable
packages; today, using this means cloning the repo and adding your own dashboards under
`example/dashboards/`.

## License

[GPL-3.0](LICENSE).
