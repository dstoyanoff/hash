# hash — smart-home dashboards

pnpm monorepo of React dashboards for Home Assistant (and other integrations).

## Layout

Read [ARCHITECTURE.md](ARCHITECTURE.md) before adding a component, a device kind, or an integration: components take generic entities (`EntityRef | EntityHandle<K>`), and each integration translates its backend to that model.

- `packages/core` — `@hash/core`: the `Integration` interface, entity types, wire protocol (no React, no vendor-specific code)
- `packages/integrations/home-assistant`, `packages/integrations/music-assistant` — `@hash/integration.home-assistant`, `@hash/integration.music-assistant`: installable integration packages, no special treatment from `@hash/core`/`@hash/runtime`. A third integration follows the same shape (extend `BaseIntegration`, pick a unique `id`) and must export a `./mock` (`createMock`) and run `runIntegrationConformance` from `@hash/core/conformance` — `packages/integrations/mock-contract.test.ts` enforces both. Only `hash.config.ts` knows which ones are in use.
- `packages/ui` — `@hash/ui`: design system (theme tokens in `src/theme/`: palette in `tokens.ts`, density in `density.ts`; no CSS files or CSS variables), entity components, hooks. `pnpm --filter @hash/ui docs` serves every component in every state on its own standalone dev server — check it before building a dashboard. Icons: plain prefixed strings, no import, e.g. `'lu:lightbulb'` (Lucide) or `'tb:vacuum-cleaner'` (Tabler outline).
- `packages/runtime` — `@hash/runtime`: the `hash-dash` CLI (`dev`/`build`/`start`) plus reusable pieces (`createLayout`, entry files) that a project's own `app/` imports. It renders no chrome: a dashboard owns its whole layout. Pure library — it has no knowledge of any specific home. The bin is not called `hash` because that is a shell builtin.
- `example` — `@hash/example`: **this is the one real consumer project in this repo**, not a framework piece. It's what a real user's own repo looks like: `hash.config.ts` (integrations), `e-prim` and `@emotion/react` as its own dependencies (the styling layer `@hash/ui` is built on, available to the app's code too), a real `app/` (React Router: `root.tsx` and `routes.ts`, which lists every route), `shared/` (conventions the dashboards here reuse — e.g. one `HomeTopBar` and the switcher's dashboard list; not wired into `@hash`), and `dashboards/<id>/` — plain folders (`layout.tsx`, `pages/*.tsx`), not separate packages and not covered by this repo's tests (see Rules below). `example/dashboards/{home,second-floor,kitchen,hello}` are the dogfood dashboards.
- `templates/dashboard/` — copy-me template `create-dashboard` scaffolds a new `dashboards/<id>/` folder from.

## Commands

`pnpm install`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm generate:catalog`. `pnpm dev`/`build`/`start` at the root are thin
`pnpm --filter @hash/example <script>` passthroughs — real work happens in that package, same
as it would in a real consumer's own repo.

## Creating or editing a dashboard

Use the skills in `.claude/skills/` — start with `create-dashboard`, which points to the others
(`dashboard-rules`, `entity-discovery`, `ui-catalog`, `verify-dashboard`, `add-ui-component`).
They encode the constraints below plus everything found the hard way while building
`example/dashboards/home` (layout pitfalls and similar) — read them instead
of relying on this summary alone.

## Rules

- Node is pinned via `devEngines.runtime` in package.json and managed by pnpm (`pnpm runtime`); do not use nvm.
- A dashboard is ordinary app code, not a sandbox: it can import anything (other libraries, the project's own `shared/` files, its own helpers). `@hash/ui` components are the building blocks, and a dashboard owns its layout — it includes `TopBar`/`NavRail`/`NavDock` itself, or leaves them out.
- Do not edit `packages/*` when creating a dashboard; propose a separate change instead (see `add-ui-component` for the one deliberate exception, for `packages/ui` only). Registering a new dashboard touches `example/app/routes.ts` (the one file listing every route; plus `example/shared/dashboards.ts` if it should appear in the top bar's switcher) — that's expected, not an exception to this rule, since all of them live inside `example`, not `packages/*`.
- There is no dashboard manifest: a dashboard's URL is its `route('dashboard/<id>', …)` in `routes.ts`, and its tab title is the entry module's `meta` export.
- Tests (`pnpm test`) cover `packages/*` only. Don't add tests under `example/dashboards/*` — verify a dashboard with `verify-dashboard` (typecheck plus an actual look at it running) instead.
- `.claude/skills/ui-catalog/CATALOG.md` is generated (`pnpm generate:catalog`) from `packages/ui/src`; never hand-edit it, and regenerate after changing a component's doc comment or props — CI fails if it drifts.
- Work on a feature branch and open a PR; milestones are tracked as GitHub issues.
- Dependencies use exact versions (no `^`/`~`); `.npmrc` sets `save-exact=true`, so `pnpm add` pins automatically.
