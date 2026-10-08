import { afterEach, beforeEach, expect, test } from 'vitest';
import { DENSITY } from '../density.ts';
import { centeringOffsets, gridFromDevice, gridMetrics, offGrid } from '../grid.ts';

test('the module is the spacing unit, and the gap, tile and header are whole modules in either density', () => {
  for (const density of ['comfortable', 'compact'] as const) {
    const metrics = gridMetrics(DENSITY[density].space);
    expect(metrics.gap / metrics.module).toBeCloseTo(3);
    expect(metrics.tile / metrics.module).toBeCloseTo(Math.round(metrics.tile / metrics.module));
    expect(metrics.header / metrics.module).toBeCloseTo(
      Math.round(metrics.header / metrics.module),
    );
  }

  expect(gridMetrics(12)).toMatchObject({
    module: 4,
    gap: 12,
    tile: 48,
    header: 32,
    tilePitch: 60,
    headerPitch: 44,
  });
});

test('a card spanning n tile pitches is n tiles and n-1 gaps tall', () => {
  const { tile, gap, tilePitch } = gridMetrics(12);
  expect(2 * tilePitch - gap).toBe(2 * tile + gap);
  expect(2 * tilePitch - gap).toBe(108);
});

test('a box is off the grid when its top or its height is not a whole number of modules', () => {
  expect(offGrid(60, 48, 4)).toBe(false);
  expect(offGrid(59, 48, 4)).toBe(true);
  expect(offGrid(60, 47, 4)).toBe(true);
  // A pixel of rounding on the screen is not a miss for the fractional compact module.
  expect(offGrid(60.3, 48.2, 4)).toBe(false);
});

test('what is left of a height after whole modules is shared between the top and the bottom, in whole pixels', () => {
  // 435px of room is 108 modules of 4px and 3px over: 1 on top, 2 below.
  expect(centeringOffsets(435, 4)).toEqual({ top: 1, bottom: 2 });
  expect(centeringOffsets(436, 4)).toEqual({ top: 0, bottom: 0 });
  expect(centeringOffsets(437, 4)).toEqual({ top: 0, bottom: 1 });
  // The compact module is fractional: the leftover is still whole pixels, never more than a module.
  const { top, bottom } = centeringOffsets(400, 8 / 3);
  expect(Number.isInteger(top) && Number.isInteger(bottom)).toBe(true);
  expect(top + bottom).toBeLessThan(8 / 3);
  // No room at all, or a page that is not measured yet: nothing to share.
  expect(centeringOffsets(0, 4)).toEqual({ top: 0, bottom: 0 });
  expect(centeringOffsets(-5, 4)).toEqual({ top: 0, bottom: 0 });
});

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

test('?grid turns the grid on, and the device keeps it until ?grid=off', () => {
  expect(gridFromDevice()).toBe(false);

  window.history.replaceState({}, '', '/?grid');
  expect(gridFromDevice()).toBe(true);

  window.history.replaceState({}, '', '/elsewhere');
  expect(gridFromDevice()).toBe(true);

  window.history.replaceState({}, '', '/?grid=off');
  expect(gridFromDevice()).toBe(false);

  window.history.replaceState({}, '', '/elsewhere');
  expect(gridFromDevice()).toBe(false);
});
