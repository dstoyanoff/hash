import type { CSSObject, Theme } from '@emotion/react';

/** The round icon button every tile, drawer and stepper uses, without a size: give it `width` and
 * `height` props, or `iconButtonSize` for the density's usual one. (A size in here would outrank
 * the props, since `css` is applied after them.) State comes from data attributes (`data-active`,
 * `data-feedback`, `data-primary`) so a component only sets props. Order matters: later rules win
 * at equal specificity. */
export const iconButtonStyles = ({ palette, radius }: Theme): CSSObject => ({
  display: 'grid',
  placeItems: 'center',
  // A circle stays a circle: in a row with long text it keeps its size instead of being squeezed.
  flexShrink: 0,
  padding: 0,
  border: 0,
  borderRadius: radius.full,
  background: palette.surfaceRaised,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease',
  '&:disabled': { cursor: 'default', opacity: 0.5 },
  "&[data-active='true']": { color: palette.warm },
  "&[data-feedback='pending']": { opacity: 0.6 },
  "&[data-feedback='done']": { background: palette.accent, color: palette.accentText },
  "&[data-feedback='error']": { color: palette.danger },
  "&[data-primary='true']": { background: palette.accent, color: palette.accentText },
});

/** The density's usual diameter for an icon button, for one that is not given a size of its own. */
export const iconButtonSize = ({ density }: Theme): CSSObject => ({
  width: density.iconCircle,
  height: density.iconCircle,
});
