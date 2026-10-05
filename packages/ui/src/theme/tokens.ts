import '@emotion/react';
import type { TypographySpecs } from 'e-prim';
import type { DensityTokens } from './density.ts';

declare module '@emotion/react' {
  interface Theme {
    /** Set by `HashProvider` from its `density` prop. */
    density: DensityTokens;
  }
}

declare module 'e-prim' {
  interface TPalette {
    bg: string;
    surface: string;
    surfaceRaised: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;

    /** Text drawn directly on the `accent` color (a solid-accent tile, or a dimmable tile's fill) — near-black in both themes, since light text on orange is low contrast. */
    onAccent: string;
    warm: string;
    danger: string;
    line: string;

    /** The left nav rail / bottom nav dock's background — a third near-black, distinct from
     * `bg`/`surface`. */
    rail: string;

    /** A subtle 1px hairline (e.g. `EntityDrawer`'s own edge) — used via the theme's `border`
     * config, so components say `border` (boolean) rather than carrying the color themselves. */
    border: string;
  }

  interface TRadius {
    full: string;
    card: string;
    drawer: string;

    /** The nav rail/dock's rounded-square icon buttons. */
    chrome: string;

    /** A status/pill row inside a drawer (e.g. `LightTile`'s power row). */
    row: string;

    /** A small chrome control (e.g. `EntityDrawer`'s expand/close buttons). */
    small: string;
  }

  interface TShadow {
    /** `EntityDrawer`'s own drop shadow. */
    drawer: string;
  }

  interface TZIndex {
    scrim: number;
    drawer: number;

    /** The page navigation (`NavRail`), fixed over a dashboard. */
    nav: number;

    /** A menu or status panel that drops from a control (the top bar's), above the page. */
    dropdown: number;

    /** A floating panel anchored to a control (the date picker's calendar), above what it sits in. */
    popover: number;
  }

  interface TTypography {
    /** A tile's own name (`Tile`'s label). */
    label: TypographySpecs;

    /** Muted status/secondary text (a tile's status line, a drawer row's timestamp). */
    secondary: TypographySpecs;

    /** A drawer's header name. */
    heading: TypographySpecs;

    /** Regular body copy inside a drawer (e.g. a history entry's message). */
    body: TypographySpecs;

    /** Emphasized body copy (a history entry's actor name, a status row's own label). */
    bodyStrong: TypographySpecs;

    /** Small uppercase, letter-spaced section labels ("History", a chart's "Power" label). */
    eyebrow: TypographySpecs;

    /** A large numeric readout (the energy chart's current wattage). */
    stat: TypographySpecs;

    /** A prominent heading, bigger than `heading` (the `TopBar`'s own title/dashboard switcher). */
    title: TypographySpecs;

    /** A `RoomHeader`'s title (a room name) — quiet, muted, not a heading that competes with the tiles. */
    roomTitle: TypographySpecs;

    /** The `TopBar`'s own clock reading — large enough to read at a glance from across a room. */
    clock: TypographySpecs;
  }
}
