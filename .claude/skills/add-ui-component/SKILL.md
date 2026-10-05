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
possible with a `RoomHeader` plus loose rows and `Grid`s), or by a prop that already exists but
isn't documented clearly. Only proceed if it's genuinely missing.

## Steps

1. **Design it as a token consumer, not a one-off.** Follow the existing files in
   `packages/ui/src/layout/` or `packages/ui/src/entities/` for shape: a `kebab-case.tsx` filename,
   an exported `XProps` interface with a one-line doc comment per non-obvious prop, an exported
   `function X(props: XProps)` with a leading doc comment summarizing what it does. Style with
   e-prim top-level props first (`Box`/`Flex`/`Grid`/`Typography`: `p`, `gap`, `width`, `radius`,
   `background`, `color`, `position`, `zIndex`, `cursor`, `align`…), theme tokens only (no raw
   colors, radii or z-indexes). Never a `style` prop. The Emotion `css` prop is for what has no prop
   (pseudo-selectors, `data-*` states, `inset`, `touch-action`, dynamic colors), written as a theme
   function (`({ palette, density }) => …`), and never repeats a prop (the `css` prop outranks
   props). Reuse `PlainButton` (unstyled button), `RoundButton` (round icon button) and `Cover`
   (fill-the-box image) instead of re-creating their resets or spreading style objects. No entity- or dashboard-specific logic (that belongs in the entity component or the
   dashboard itself) — a layout primitive should work for anything.
2. **Export it** from `packages/ui/src/index.ts`.
3. **Document every prop.** Each prop in `XProps` needs a `/** ... */` doc comment (one or several lines; it is what the IDE shows on hover) and the component needs one too. `pnpm generate:catalog` turns them into the gallery's props table (`gallery/props-data.ts`) and the catalog, and a test fails if any prop is undocumented.
4. **Add it to the gallery** (`packages/ui/src/gallery/fixtures.ts` and `gallery.tsx`, with `components={['Name']}` on its `ComponentDoc`) covering its
   states (loading/unavailable/unknown/ready if it's entity-backed) the same way existing
   components are covered.
5. **Write tests** in a sibling `__tests__/` folder (`*.test.tsx`, Testing Library — see any
   existing `entities/__tests__/*.test.tsx` for the pattern, including `test-utils.tsx`'s
   `renderWithMock` helper) and add or update a `gallery/__tests__/gallery.test.tsx` assertion if
   relevant.
6. **Regenerate the catalog**: `pnpm generate:catalog`. Don't hand-edit
   `.claude/skills/ui-catalog/CATALOG.md` — it's generated from source doc comments and prop types,
   and CI fails if it doesn't match; if the catalog output looks wrong, fix the source comment,
   not the generated file.
7. **Verify**: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`, plus look at it in
   `pnpm --filter @hash/ui docs` (the gallery is `packages/ui`'s own standalone dev command, not
   part of `packages/runtime` or any project's own routes).
8. **Then**, and only then, use the new component from the dashboard that needed it.

## Boundaries

- This workflow is for `packages/ui` only. A genuine `packages/runtime` or `packages/core` change is
  further out of scope for an agent session building a dashboard — stop and describe what's needed
  instead of attempting it here.
- Keep this as its own commit/PR distinct from the dashboard change that motivated it, so a core
  change is always reviewed on its own.
