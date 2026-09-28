# Dashboard template

Copy-me template consumed by the `create-dashboard` skill (`.claude/skills/create-dashboard/`).
Not a real package — every file here ends in `.template` (or, for this README, is ignored by the
tooling) so pnpm/tsc/oxlint never try to treat it as one.

Placeholders (replaced by the skill, not by hand):

- `__DASHBOARD_ID__` — kebab-case id; becomes the folder name under `examples/` and the route
  `/dashboard/{id}`.
- `__DASHBOARD_TITLE__` — human-readable title (page `<title>`, home page listing).
- `__VIEWPORT_WIDTH__` / `__VIEWPORT_HEIGHT__` — target device size in CSS pixels.

Don't edit this template as a shortcut for changing a real dashboard — it only affects dashboards
created after the change.
