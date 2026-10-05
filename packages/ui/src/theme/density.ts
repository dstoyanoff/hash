export type Density = 'comfortable' | 'compact';

/** How many of the theme's spacing units make one `space`: `gap={3}` is one space. */
export const UNITS_PER_SPACE = 3;

/** Sizes that scale with how much room a display has, in px. Spacing follows it on its own: the
 * theme's spacing unit is `space / 3`, so e-prim's `gap={3}`, `p={3}` and friends are one space,
 * and every other spacing prop scales with it. The rest are read from the theme in a `css` prop:
 * `css={({ density }) => ({ height: density.tileHeight })}`. */
export interface DensityTokens {
  /** The gap between tiles, in px: three spacing units, so `gap={3}`. Changing it rescales all spacing. */
  space: number;
  tileHeight: number;
  iconSize: number;

  /** The diameter of the round icon buttons and media art. */
  iconCircle: number;
}

export const DENSITY: Record<Density, DensityTokens> = {
  comfortable: { space: 12, tileHeight: 68, iconSize: 24, iconCircle: 44 },
  // Small square displays (e.g. a Shelly wall display).
  compact: { space: 8, tileHeight: 52, iconSize: 20, iconCircle: 36 },
};
