---
name: verify-dashboard
description: How to verify a dashboard actually works before calling the task done — checks, plus visually checking it in a browser. Use after creating or editing a dashboard in examples/*.
---

# Verify a dashboard

Run all of these; don't stop at typecheck passing.

## 1. Automated checks

```bash
pnpm lint
pnpm format:check   # or `pnpm format` to fix
pnpm typecheck
pnpm test
pnpm validate:dashboards
```

`validate:dashboards` specifically catches: a bad id, a missing `routes.tsx`, the manifest's `id`
not matching its folder name, and a missing/invalid `viewport`. Fix everything it reports — don't
treat it as advisory.

## 2. Look at it in a real browser

The dev server is the only reliable way to catch a layout problem (e.g. a squeezed `ClimateTile`)
— tests check behaviour, not how it reads.

```bash
pnpm dev
```

Then open `http://localhost:3000/dashboard/<id>` (and any other page/route it has).

**If you edited dashboard files while `pnpm dev` was already running, restart it before checking.**
Vite's dev server doesn't watch `examples/*` for changes (it's outside its own root at `.hash/`),
so edits to a dashboard's source silently don't show up until `hash-dash dev` is restarted — this
cost real time while building `examples/home`; don't assume a stale-looking page means your change
is wrong.

Check, at the dashboard's own declared viewport:

- Every section/tile you added is present and labelled correctly (no truncated labels, no two
  tiles with the same name).
- At least one interaction round-trips: click a light/scene/action tile, or drag a dimmable one,
  and confirm the state updates (it's reading from the mock or real backend through the actual
  WebSocket proxy, not a static render).
- If there's more than one page, every tab link goes to the right page and highlights as current
  (this specifically regressed once from a `NavTabs` relative-link bug — see `dashboard-rules`).
- Nothing shows raw text like "unavailable" rendered incorrectly, unstyled, or a blank tile for a
  bad ref — bad refs should read "Not found", not error or vanish.
- Check the browser console for errors (not just the visual result) — a page can look fine while
  logging a real problem underneath (e.g. a WebSocket reconnect loop).

## 3. Production build (only if asked to ship / for a final check)

```bash
pnpm build
pnpm start
```

Open the same routes again. This exercises the SPA fallback and the real bundle, not just dev's
on-the-fly transform — worth doing once before calling a dashboard finished, cheap to skip during
iteration.
