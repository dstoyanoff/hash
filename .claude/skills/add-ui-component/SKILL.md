---
name: add-ui-component
description: The stricter workflow for adding or changing a component in packages/ui (the design system), as opposed to building a dashboard. Use only when a dashboard genuinely needs a primitive that doesn't exist yet — confirm with the user first.
---

# Add a `@hash/ui` component

This is the deliberate exception to `dashboard-rules`'s "never edit `packages/*`" rule. Use it only
when: (a) you're building a dashboard and hit a real gap in `@hash/ui` — not a preference for
different styling — and (b) you've told the user this needs a core change and they've agreed to it
as a separate change from the dashboard itself. Don't silently fold a UI change into a "create a
dashboard" task.

## Before adding anything

Check `.claude/skills/ui-catalog/CATALOG.md` and `packages/ui/src/` again — the gap might already
be covered by composing existing components (see `dashboard-rules`'s Layout section for what's
possible with `Section columns={0}` plus nested `Grid`s), or by a prop that already exists but
isn't documented clearly. Only proceed if it's genuinely missing.

## Steps

1. **Design it as a token consumer, not a one-off.** Follow the existing files in
   `packages/ui/src/layout/` or `packages/ui/src/entities/` for shape: a `kebab-case.tsx` filename,
   an exported `XProps` interface with a one-line doc comment per non-obvious prop, an exported
   `function X(props: XProps)` with a leading doc comment summarizing what it does. Style only
   through `--hash-*` CSS variables already defined in `packages/ui/src/styles.css` — add new
   variables there if a genuinely new value is needed, don't hardcode colors/sizes in the
   component. No entity- or dashboard-specific logic (that belongs in the entity component or the
   dashboard itself) — a layout primitive should work for anything.
2. **Export it** from `packages/ui/src/index.ts`.
3. **Add it to the gallery** (`packages/ui/src/gallery/fixtures.ts` and `gallery.tsx`) covering its
   states (loading/unavailable/unknown/ready if it's entity-backed) the same way existing
   components are covered.
4. **Write tests** next to it (`*.test.tsx`, Testing Library — see any existing `entities/*.test.tsx`
   for the pattern, including `test-utils.tsx`'s `renderWithMock` helper) and add or update a
   `gallery.test.tsx` assertion if relevant.
5. **Regenerate the catalog**: `pnpm generate:catalog`. Don't hand-edit
   `.claude/skills/ui-catalog/CATALOG.md` — it's generated from source doc comments and prop types,
   and CI fails if it doesn't match; if the catalog output looks wrong, fix the source comment,
   not the generated file.
6. **Verify**: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`, plus look at
   `/gallery` in `pnpm dev`.
7. **Then**, and only then, use the new component from the dashboard that needed it.

## Boundaries

- This workflow is for `packages/ui` only. A genuine `apps/runtime` or `packages/core` change is
  further out of scope for an agent session building a dashboard — stop and describe what's needed
  instead of attempting it here.
- Keep this as its own commit/PR distinct from the dashboard change that motivated it, so a core
  change is always reviewed on its own.
