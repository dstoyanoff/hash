import { UNITS_PER_SPACE } from './density.ts';

/** The icon badge a tile starts with, in px: the one size in a tile that does not scale with density. */
export const BADGE = 32;

/** The height of a room header, in px. */
export const HEADER = 32;

/** The vertical grid every card sits on. The module is the theme's spacing unit (a third of a
 * space: 4px in comfortable density, 2.67px in compact), so the gap between cards is always 3
 * modules, and a tile and a header are whole numbers of them in either density. Sizes are in px;
 * `pitch` is a card's height plus the gap that follows it, and a card spanning n pitches is n heights
 * and n-1 gaps tall. */
export interface GridMetrics {
  module: number;
  gap: number;
  tile: number;
  header: number;
  tilePitch: number;
  headerPitch: number;
}

export function gridMetrics(space: number): GridMetrics {
  const module = space / UNITS_PER_SPACE;
  // A tile is its badge between two spacing-unit-2 paddings.
  const tile = BADGE + 4 * module;

  return {
    module,
    gap: space,
    tile,
    header: HEADER,
    tilePitch: tile + space,
    headerPitch: HEADER + space,
  };
}

/** Whether a box's top edge, measured from the grid's origin, or its height is off the module grid. Browsers round to the pixel, so a little under a pixel is still on it. */
export function offGrid(top: number, height: number, module: number): boolean {
  const tolerance = Math.max(0.5, module * 0.15);
  const off = (value: number) => {
    const rest = Math.abs(value) % module;
    return Math.min(rest, module - rest) > tolerance;
  };

  return off(top) || off(height);
}

const GRID_KEY = 'hashsome:grid';

/** Whether this device asked to see the grid: `?grid` (or `?grid=on`) on the address, which is also
 * remembered, or what an earlier visit remembered. `?grid=off` forgets it. */
export function gridFromDevice(): boolean {
  try {
    const asked = new URLSearchParams(window.location.search).get('grid');
    if (asked === '' || asked === 'on') {
      localStorage.setItem(GRID_KEY, 'on');
      return true;
    }

    if (asked === 'off') {
      localStorage.removeItem(GRID_KEY);
      return false;
    }

    return localStorage.getItem(GRID_KEY) === 'on';
  } catch {
    return false;
  }
}
