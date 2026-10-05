import { mockLight, type LightEntity } from '@hashsome/core';
import { expect, test } from 'vitest';
import {
  applyPreset,
  contrastRatio,
  ensureContrast,
  isPresetActive,
  kelvinToRgb,
  resolveLightColor,
  rgbToHs,
} from '../light-color.ts';

const light = (init: Parameters<typeof mockLight>[0] = {}) =>
  ({ ...mockLight(init), ref: 'ha:x' }) as LightEntity;

test('warm whites are redder than cool whites', () => {
  const warm = kelvinToRgb(2200);
  const cool = kelvinToRgb(6500);
  expect(warm.r).toBeGreaterThan(warm.b);
  expect(cool.b).toBeGreaterThanOrEqual(cool.r - 5);
  expect(warm.b).toBeLessThan(cool.b);
});

test('the model says which color is live, and a light with none has no color', () => {
  expect(resolveLightColor(light({ color: { mode: 'temperature', kelvin: 2700 } }))).toEqual(
    kelvinToRgb(2700),
  );

  const hs = resolveLightColor(light({ color: { mode: 'color', hue: 120, saturation: 100 } }));
  expect(rgbToHs(hs!)[0]).toBe(120);
  expect(
    resolveLightColor(light({ color: { mode: 'color', hue: 0, saturation: 0, rgb: [1, 2, 3] } })),
  ).toEqual({ r: 1, g: 2, b: 3 });

  expect(resolveLightColor(light())).toBeUndefined();
  expect(resolveLightColor(undefined)).toBeUndefined();
});

test('presets become commands, and only apply to lights that can take them', () => {
  expect(applyPreset({ label: 'w', kelvin: 3000 }, { colorTemp: true, hs: false })).toEqual({
    command: 'setColorTemperature',
    args: { kelvin: 3000 },
  });

  expect(
    applyPreset({ label: 'g', hs: [120, 100] }, { colorTemp: true, hs: false }),
  ).toBeUndefined();

  expect(applyPreset({ label: 'w', kelvin: 3000 }, { colorTemp: false, hs: true })).toMatchObject({
    command: 'setColor',
  });
});

test('a preset is active only when it matches the live color', () => {
  const kelvin = { command: 'setColorTemperature', args: { kelvin: 2700 } } as const;
  expect(isPresetActive(kelvin, light({ color: { mode: 'temperature', kelvin: 2700 } }))).toBe(
    true,
  );

  expect(isPresetActive(kelvin, light({ color: { mode: 'color', hue: 1, saturation: 1 } }))).toBe(
    false,
  );

  expect(isPresetActive(kelvin, light())).toBe(false);
});

test('a pale color is darkened until it is legible on a light background, and left alone when already fine', () => {
  const beige = { r: 239, g: 234, b: 225 };
  const warm = kelvinToRgb(2700);
  expect(contrastRatio(warm, beige)).toBeLessThan(3);
  const fixed = ensureContrast(warm, beige);
  expect(contrastRatio(fixed, beige)).toBeGreaterThanOrEqual(3);
  const dark = { r: 33, g: 30, b: 38 };
  expect(ensureContrast(warm, dark)).toEqual(warm);
});
