---
name: create-dashboard
description: Scaffold and build a new dashboard under example/dashboards/. Use whenever the user asks for a new dashboard, panel, or screen for a room/device set (e.g. "create a kitchen dashboard").
---

# Create a dashboard

Load `dashboard-rules` now, in full — it defines the constraints this skill assumes. This skill is
the step-by-step process; `dashboard-rules` is the reference you'll keep needing while writing
pages.

`example` is the one real consumer project in this repo (see `AGENTS.md`) — a dashboard is a
plain folder inside it (`example/dashboards/<id>/`), not its own package.

## Steps

1. **Confirm the id, title and devices.** The id is a kebab-case slug
   (`kitchen`, `master-bedroom`) that becomes the folder name and the URL
   (`/<id>`) — it must be filesystem- and URL-safe. Layouts are responsive, so there is no
   viewport to pick.
2. **Find the real entities** using `entity-discovery` — don't guess ids.
3. **Start from an existing dashboard.** Copy `example/dashboards/second-floor/` to
   `example/dashboards/<id>/`: a single page, `pages/home.tsx`, with the shared `HomeTopBar` above two
   rooms of tiles. (For several pages with a nav rail, copy `example/dashboards/home/` instead: its
   `layout.tsx` is the nav.) It is real code that is typechecked and linted on every change, so it
   stays correct. Then make it yours: set the `meta` title and the top bar's title, rename the rooms, and
   repoint **every** entity id at the real devices from step 2. Don't leave the other dashboard's ids
   behind: `grep` the copied folder for `ha:` and check each one.
4. **Register it with the project** — a scaffolded `dashboards/<id>/` folder is not reachable from
   `pnpm dev` on its own:
   - Add `route('<id>', '../dashboards/<id>/pages/home.tsx')` to `example/app/routes.ts`, the one
     file that lists every route. (A multi-page dashboard routes its `layout.tsx` and nests the pages
     under it, as `home` does.)
   - To list it in the top bar's dashboard switcher, add `{ id, title }` to
     `example/shared/dashboards.ts` (a project convention, not wiring). Leave it out for a
     chrome-less kiosk panel; it stays reachable at `/<id>`.
   - Nothing is configured globally: a dashboard owns its layout (see `dashboard-rules`'s "Layout
     and chrome" section). The copied page already includes the project's shared `HomeTopBar`.
5. **Build the page(s).** Read `.claude/skills/ui-catalog/CATALOG.md` for what's available, and
   `example/dashboards/kitchen` for the layout patterns in `dashboard-rules`. Compose
   `@hashsome/ui` components; write no dashboard-specific CSS or state handling (`dashboard-rules`
   explains why). The page renders into the app's root layout (`app/root.tsx`: padded, scrolling) and
   includes whatever chrome it wants (the shared top bar, a nav, or nothing for a kiosk panel). No tests to write here —
   `example` isn't covered by this repo's test suite (see `dashboard-rules`'s Scope section);
   verify it the way step 7 describes instead.
6. **Register mock data for local testing**, if `example/hashsome.config.ts` is the dev instance
   being used (it is, unless told otherwise): add the new entities to its `MockIntegration` config
   so `pnpm dev` renders the dashboard with realistic states, matching the style already there for
   `dashboards/hello`/`dashboards/kitchen`. **This is one shared JS object across every
   dashboard** — a new entity key that happens to match an id already used by another dashboard
   silently overrides that dashboard's entry, and nothing (not lint, not typecheck, not tests)
   catches it. Check the existing keys first: if your new dashboard genuinely controls the same
   physical device as an existing one (e.g. two dashboards both showing the kitchen ceiling
   light), reuse that key instead of re-declaring it; otherwise pick ids that don't collide.
7. **Verify** using `verify-dashboard` before considering the task done.

## Guardrails

- Everything you create or edit lives under `example/` — the new `dashboards/<id>/` folder
  (step 3), the project-root wiring in step 4 (`app/routes.ts`, and `shared/dashboards.ts` if it's
  listed in the switcher), and the one addition to `hashsome.config.ts`'s mock data in step 6. Nothing outside
  `example/` changes — re-read `dashboard-rules`'s Scope section if a step seems to need more.
- If the user's request implies a missing `@hashsome/ui` component (checked against the catalog), stop
  and say so instead of building a one-off equivalent inline — see `add-ui-component`.
- Work on a feature branch and open a PR when done, per this repo's `AGENTS.md`.
