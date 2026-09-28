---
name: create-dashboard
description: Scaffold and build a new dashboard under examples/. Use whenever the user asks for a new dashboard, panel, or screen for a room/device set (e.g. "create a kitchen dashboard").
---

# Create a dashboard

Load `dashboard-rules` now, in full — it defines the constraints this skill assumes. This skill is
the step-by-step process; `dashboard-rules` is the reference you'll keep needing while writing
pages.

## Steps

1. **Confirm the id, title, devices and target device/viewport.** The id is a kebab-case slug
   (`kitchen`, `master-bedroom`) that becomes the folder name and the URL
   (`/dashboard/<id>`) — it must be filesystem- and URL-safe. Ask if the user hasn't said what
   screen this runs on (tablet, small square wall display, phone-shaped mount) — it decides the
   viewport (see `dashboard-rules`'s "Required shape" section for typical sizes). If you can't ask
   (a non-interactive run) default to a 1024x768 tablet mount, matching `examples/home`, and say
   clearly in your summary that this was an assumption, not a confirmed requirement.
2. **Find the real entities** using `entity-discovery` — don't guess ids.
3. **Scaffold from the template.** Copy every file in `templates/dashboard/` into
   `examples/<id>/`, stripping the `.template` suffix, and replace the placeholders
   (`__DASHBOARD_ID__`, `__DASHBOARD_TITLE__`, `__VIEWPORT_WIDTH__`, `__VIEWPORT_HEIGHT__`) with
   real values in every copied file. Don't touch `templates/dashboard/` itself.
4. **Build the page(s).** Read `.claude/skills/ui-catalog/CATALOG.md` for what's available, and
   `examples/home` for the layout patterns in `dashboard-rules`. Compose `@hash/ui` components;
   write no dashboard-specific CSS or state handling (`dashboard-rules` explains why). Add or edit
   `src/dashboard.test.tsx` to actually cover the real page content (entities, room names, at
   least one interaction), not the template's placeholder assertion — follow
   `examples/home/src/dashboard.test.tsx` for the pattern, including how to test a multi-page
   dashboard's tab bar if you added one.
5. **Register mock data for local testing**, if this repo's root `hash.config.ts` is the dev
   instance being used (it is, unless told otherwise): add the new entities to its `MockIntegration`
   config so `pnpm dev` renders the dashboard with realistic states, matching the style already
   there for `examples/hello`/`examples/home`. **This is one shared JS object across every
   dashboard** — a new entity key that happens to match an id already used by another dashboard
   silently overrides that dashboard's entry, and nothing (not lint, not typecheck, not tests)
   catches it. Check the existing keys first: if your new dashboard genuinely controls the same
   physical device as an existing one (e.g. two dashboards both showing the kitchen ceiling
   light), reuse that key instead of re-declaring it; otherwise pick ids that don't collide.
6. **Verify** using `verify-dashboard` before considering the task done.

## Guardrails

- Everything you create or edit lives under `examples/<id>/`, plus the one addition to the root
  `hash.config.ts` mock data in step 5. Nothing else changes — re-read `dashboard-rules`'s Scope
  section if a step seems to need more.
- If the user's request implies a missing `@hash/ui` component (checked against the catalog), stop
  and say so instead of building a one-off equivalent inline — see `add-ui-component`.
- Work on a feature branch and open a PR when done, per this repo's `AGENTS.md`.
