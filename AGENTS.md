# hash — smart-home dashboards

pnpm monorepo of React dashboards for Home Assistant (and other integrations).

## Layout

- `packages/core` — `@hash/core`: the `Integration` interface, entity types, wire protocol (no React, no vendor-specific code)
- `packages/integrations/home-assistant`, `packages/integrations/music-assistant` — `@hash/integration-home-assistant`, `@hash/integration-music-assistant`: installable integration packages, no special treatment from `@hash/core`/`@hash/runtime`. A third integration follows the same shape (extend `BaseIntegration`, pick a unique `id`). Only `hash.config.ts` knows which ones are in use.
- `packages/ui` — `@hash/ui`: design system (tokens in `src/styles.css`), entity components, hooks. `pnpm dev` serves every component in every state at http://localhost:3000/gallery (dev only) — check it before building a dashboard. Icons: `import { mdiXxx } from '@hash/ui'`.
- `apps/runtime` — `@hash/runtime`: server + `hash-dash` CLI (`dev`/`build`/`start`) that discovers and serves dashboards. The bin is not called `hash` because that is a shell builtin.
- `examples/*` — dashboards (one package each)
- `templates/*` — copy-me templates

## Commands

`pnpm install`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm validate:dashboards`, `pnpm generate:catalog`

## Creating or editing a dashboard

Use the skills in `.claude/skills/` — start with `create-dashboard`, which points to the others
(`dashboard-rules`, `entity-discovery`, `ui-catalog`, `verify-dashboard`, `add-ui-component`).
They encode the constraints below plus everything found the hard way while building
`examples/home` (layout pitfalls, a `NavTabs` routing bug, etc.) — read them instead of relying on
this summary alone.

## Rules

- Node is pinned via `devEngines.runtime` in package.json and managed by pnpm (`pnpm runtime`); do not use nvm.
- Dashboards (`examples/*`, `templates/*`) may import only `react`, `react-router`, `@hash/ui` and `@hash/core` (enforced by oxlint).
- Do not edit `packages/*` or `apps/*` when creating a dashboard; propose a separate change instead (see `add-ui-component` for the one deliberate exception, for `packages/ui` only).
- Every dashboard's `dashboard.ts` manifest needs an `id` matching its folder name and a set `viewport`; `pnpm validate:dashboards` enforces this in CI.
- `.claude/skills/ui-catalog/CATALOG.md` is generated (`pnpm generate:catalog`) from `packages/ui/src`; never hand-edit it, and regenerate after changing a component's doc comment or props — CI fails if it drifts.
- Work on a feature branch and open a PR; milestones are tracked as GitHub issues.
- Dependencies use exact versions (no `^`/`~`); `.npmrc` sets `save-exact=true`, so `pnpm add` pins automatically.
