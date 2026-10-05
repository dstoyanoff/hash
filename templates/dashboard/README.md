# Dashboard template

Copy-me template consumed by the `create-dashboard` skill (`.claude/skills/create-dashboard/`).
A complete, working starter dashboard — a layout (the shared top bar above a page outlet) and a
home page with two sample rooms to repoint at your own devices. Not a real dashboard until it's
copied: every file here ends in `.template` (or, for this README, is ignored by the tooling) so
pnpm/tsc/oxlint never try to treat it as one.

This folder becomes a plain subfolder under `example/dashboards/<id>/` — a dashboard is
content inside the one `@hash/example` project, not its own package (no `package.json`,
`tsconfig.json` or `vitest.config.ts` of its own).

Styling: a dashboard can use `e-prim`'s `Box`/`Flex`/`Typography` directly — it's a dependency of the
project (`example/package.json`), not just of `@hash/ui`.

Placeholders (replaced by the skill, not by hand):

- `__DASHBOARD_ID__` — kebab-case id; becomes the folder name under `example/dashboards/` and
  the route `/dashboard/{id}`.
- `__DASHBOARD_TITLE__` — human-readable title (page `<title>`, dashboard-switcher dropdown).

Scaffolding `dashboards/<id>/` alone is not enough to reach it from `pnpm dev`: add one `route()`
block to `example/app/routes.ts` — see `create-dashboard`'s registration step.

Don't edit this template as a shortcut for changing a real dashboard — it only affects dashboards
created after the change.
