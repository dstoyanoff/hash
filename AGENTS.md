# hash — smart-home dashboards

pnpm monorepo of React dashboards for Home Assistant (and other integrations).

## Layout

- `packages/core` — `@hash/core`: framework-agnostic integrations, entity types, wire protocol (no React)
- `packages/ui` — `@hash/ui`: design system components and hooks
- `apps/runtime` — `@hash/runtime`: server + `hash-dash` CLI (`dev`/`build`/`start`) that discovers and serves dashboards. The bin is not called `hash` because that is a shell builtin.
- `examples/*` — dashboards (one package each)
- `templates/*` — copy-me templates

## Commands

`pnpm install`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`

## Rules

- Node is pinned via `devEngines.runtime` in package.json and managed by pnpm (`pnpm runtime`); do not use nvm.
- Dashboards (`examples/*`, `templates/*`) may import only `react`, `@hash/ui` and `@hash/core`.
- Do not edit `packages/*` or `apps/*` when creating a dashboard; propose a separate change instead.
- Work on a feature branch and open a PR; milestones are tracked as GitHub issues.
- Dependencies use exact versions (no `^`/`~`); `.npmrc` sets `save-exact=true`, so `pnpm add` pins automatically.
