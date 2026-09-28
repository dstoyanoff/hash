---
name: dashboard-rules
description: The hard constraints for creating or editing a dashboard in examples/*. Load this before writing any dashboard code — it defines what you may touch and the sharp edges found while building examples/home.
---

# Dashboard rules

These are constraints, not suggestions. If a task seems to require breaking one, stop and say so
instead of working around it — see "When a rule is in the way" at the end.

## Scope

- A dashboard lives entirely under `examples/<id>/`. You may create and edit files there freely.
- **Never edit `packages/core`, `packages/ui`, or `apps/runtime`** while creating or changing a
  dashboard, even for a one-line fix, even if it seems trivial. If the design system is missing
  something, that's a separate, explicit task — see `add-ui-component`.
- A dashboard's code may import only: `react`, `react-router`, `@hash/ui`, `@hash/core`. This is
  enforced by oxlint (`no-restricted-imports` in `.oxlintrc.json`) — a violation fails `pnpm lint`.
  No raw `fetch`/`WebSocket`, no relative imports into `packages/` or `apps/`.
- `pnpm format` (write mode) reformats the _whole repo_, not just your dashboard — if another
  file happened to already be out of sync with Prettier, running it can sweep in an unrelated
  change. After running it, check `git status`/`git diff` and make sure everything outside
  `examples/<id>/` (and the expected `hash.config.ts` mock-data addition) is unchanged before
  committing.
- Read `.claude/skills/ui-catalog/CATALOG.md` before writing dashboard code. It lists every
  component, its props and its doc comment, generated straight from `packages/ui/src` so it can't
  be stale. Don't invent a component that isn't there — use what's listed, or raise it as a
  separate `add-ui-component` task.

## Required shape

Every dashboard is a package at `examples/<id>/`:

```
examples/<id>/
├─ package.json       name: "@hash/example-<id>"
├─ tsconfig.json
├─ vitest.config.ts
└─ src/
   ├─ dashboard.ts     export default defineDashboard({ id, title, viewport })
   ├─ routes.tsx       export default RouteObject[]
   ├─ pages/*.tsx
   └─ *.test.tsx
```

- `<id>` is kebab-case (`^[a-z0-9][a-z0-9-]*$`) and **must equal** `manifest.id` in `dashboard.ts`
  — `pnpm validate:dashboards` enforces this along with a required, positive `viewport`.
- Use `create-dashboard` to scaffold this from `templates/dashboard/`; don't hand-roll it.
- Pick a viewport that matches the real device: a tablet mount is typically landscape
  (`1024x768`-ish), a small square wall display is small and square (`480x480`-ish, see the
  Shelly-style panel in Milestone 5's original screenshots), a phone-shaped mount is tall and
  narrow. Ask if you don't know the device.

## Entity refs and state

- Refs are `<integration>:<id>` strings: `ha:<domain>.<name>` for Home Assistant (e.g.
  `ha:light.kitchen_lamp`), or `ma:<player_id>` for a `media_player`/`MediaPlayerBar` talked to
  directly via Music Assistant instead of through Home Assistant — the id is the player's own
  `player_id` verbatim, not a `domain.name` pair. Use `entity-discovery` to find real ids instead
  of guessing them.
- Every `@hash/ui` entity component already handles loading / not-found / unavailable / unknown
  states consistently (dims, disables, shows why). **Don't build your own state handling** —
  don't check `state === 'unavailable'` yourself or hide a tile when its entity is missing; pass
  the ref to the component and let it show the real state. A tile for a device that doesn't exist
  yet (not deployed, wrong id) should render as "Not found", not disappear or throw.

## Layout

Read `examples/home/src/pages/downstairs.tsx` and `upstairs.tsx` as the reference layout, and open
`/gallery` (`pnpm dev`) to see every component live. Concretely:

- Group by room with `<Section title="..." icon={...} readouts={...}>`; put per-room sensors in
  `readouts`, not as standalone tiles, unless they're the main point of that section.
- **Give a `ClimateTile` its own row.** It renders a mode button and a temperature stepper and
  needs real width — cramming it into the same 3-column grid as light tiles truncates its label.
  Found the hard way while building `examples/home`:
  ```tsx
  <Section title="living room" icon={mdiSofa} columns={0}>
    <Grid columns={3}>
      <LightTile entity="ha:light.lamp" name="lamp" />
      {/* ...other lights */}
    </Grid>
    <ClimateTile entity="ha:climate.heater" name="heater" /> {/* full width, own row */}
    <Grid columns={2}>{/* scene/action buttons */}</Grid>
  </Section>
  ```
  (`Section columns={0}` renders its children directly instead of wrapping them in one shared
  `Grid`, so you can mix row shapes like this.)
- **Give every tile on a page a distinct label.** Two tiles both named "lamp" (e.g. a living-room
  lamp and a porch lamp) are ambiguous to a user and to `getByRole('button', { name })` in tests —
  found and fixed in `examples/home`. Prefer the entity's own room-qualified name, or pass an
  explicit `name` when it would otherwise collide.
- A media bar or anything else that wants the full width goes in its own
  `<Section columns={0}>`, not squeezed into a grid cell.

## Multi-page dashboards and `NavTabs`

If you add a second page, wrap the pages in a pathless layout route (element + `children`, no
`path`) that renders `<Outlet />`, as `examples/home/src/layout.tsx` does. **`NavTabs`' `to` values
must be absolute, e.g. `` `/dashboard/${dashboard.id}/upstairs` `` — not relative segments like
`upstairs`.** React Router's default relative-link resolution under a pathless layout route
resolves against the _current_ matched route, not the layout's own base, so a relative link from
one page to a sibling page turns into a broken doubled path (e.g. `/upstairs/upstairs`) and highlights
the wrong tab. This bit `examples/home`; copy its `layout.tsx` pattern (compute
`` `/dashboard/${dashboard.id}` `` from the dashboard's own manifest, once).

## Icons

`import { mdiXxx } from '@hash/ui'` — any name from the
[Material Design Icons set](https://pictogrammers.com/library/mdi/) is re-exported.

## Style

- No custom CSS beyond what `@hash/ui` components already provide. If a layout genuinely can't be
  built from `Dashboard` / `Screen` / `Grid` / `Section` / `Tile` plus the entity components, that
  points at a missing primitive — raise it (see `add-ui-component`), don't reach for inline styles
  as a workaround. (`examples/home/src/layout.tsx` uses a couple of small inline styles for its
  header row and connection badge — that's fine; it's page chrome, not a device tile.)
- Exact dependency versions, no `^`/`~` (see the root `.npmrc`); match the versions already used
  by `examples/home` and `packages/ui` for shared deps like `react`, `react-router`,
  `@testing-library/react`.

## When a rule is in the way

If following the user's request seems to require editing `packages/*` or `apps/runtime`, or
inventing an import outside the allowed list: stop, explain what's missing and why it needs a core
change, and propose it as a separate task (`add-ui-component`). Don't quietly work around the
restriction inside the dashboard package.
