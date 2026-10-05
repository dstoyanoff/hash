import type { LightEntity } from '@hash/core';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** A pre-defined color shown as a swatch in a light tile's color overlay. */
export interface LightColorPreset {
  label: string;

  /** A white temperature, for lights that support `color_temp`. */
  kelvin?: number;

  /** Hue (0–360) and saturation (0–100), for lights that only support color. */
  hs?: [number, number];

  /** Literal CSS color for the swatch; derived from `kelvin`/`hs` when omitted. */
  color?: string;
}

export const DEFAULT_COLOR_PRESETS: LightColorPreset[] = [
  { label: 'Candle', kelvin: 2200 },
  { label: 'Warm white', kelvin: 2700 },
  { label: 'Neutral white', kelvin: 4000 },
  { label: 'Daylight', kelvin: 6500 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Approximate blackbody color for a white temperature (Tanner Helland's curve fit). */
export function kelvinToRgb(kelvin: number): Rgb {
  const t = clamp(kelvin, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * (t - 60) ** -0.0755148492;

  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
  };
}

export function hsToRgb(hue: number, saturation: number): Rgb {
  const s = clamp(saturation, 0, 100) / 100;
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const [r1, g1, b1] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];

  const m = 1 - c;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHs({ r, g, b }: Rgb): [number, number] {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return [Math.round(h), Math.round(max === 0 ? 0 : (d / max) * 100)];
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgb(hex: string): Rgb | undefined {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return undefined;
  }

  const n = parseInt(match[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbCss({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg`, pushed darker (on a light `bg`) or lighter (on a dark one) until it reaches `min` contrast
 * against `bg` — so a pale light color (warm white) stays visible as an icon in the light theme. */
export function ensureContrast(fg: Rgb, bg: Rgb, min = 3): Rgb {
  const target = luminance(bg) > 0.4 ? 0 : 255;
  let out = fg;
  for (let i = 0; i < 20 && contrastRatio(out, bg) < min; i++) {
    out = {
      r: Math.round(out.r + (target - out.r) * 0.12),
      g: Math.round(out.g + (target - out.g) * 0.12),
      b: Math.round(out.b + (target - out.b) * 0.12),
    };
  }

  return out;
}

/** The light's current color as displayed. The model's `color` already says which mode is live, so
 * there is no stale attribute to second-guess. */
export function resolveLightColor(light: LightEntity | undefined): Rgb | undefined {
  const color = light?.color;
  if (!color) {
    return undefined;
  }

  if (color.mode === 'temperature') {
    return kelvinToRgb(color.kelvin);
  }

  return color.rgb
    ? { r: color.rgb[0], g: color.rgb[1], b: color.rgb[2] }
    : hsToRgb(color.hue, color.saturation);
}

export function currentHs(light: LightEntity | undefined): [number, number] {
  return light?.color?.mode === 'color' ? [light.color.hue, light.color.saturation] : [0, 100];
}

/** A command (and its arguments) that applies a preset to a light. */
export type PresetApplication =
  | { command: 'setColorTemperature'; args: { kelvin: number } }
  | { command: 'setColor'; args: { hue: number; saturation: number } };

/** How a preset would be applied to a light with these capabilities, or `undefined` if it can't be. */
export function applyPreset(
  preset: LightColorPreset,
  caps: { colorTemp: boolean; hs: boolean },
): PresetApplication | undefined {
  if (preset.kelvin !== undefined && caps.colorTemp) {
    return { command: 'setColorTemperature', args: { kelvin: preset.kelvin } };
  }

  if (caps.hs) {
    const hs =
      preset.hs ?? (preset.kelvin !== undefined ? rgbToHs(kelvinToRgb(preset.kelvin)) : undefined);

    if (hs) {
      return { command: 'setColor', args: { hue: hs[0], saturation: hs[1] } };
    }
  }

  return undefined;
}

export function presetCss(preset: LightColorPreset): string {
  if (preset.color) {
    return preset.color;
  }

  if (preset.kelvin !== undefined) {
    return rgbCss(kelvinToRgb(preset.kelvin));
  }

  return preset.hs ? rgbCss(hsToRgb(preset.hs[0], preset.hs[1])) : '#ffffff';
}

export function isPresetActive(
  application: PresetApplication,
  light: LightEntity | undefined,
): boolean {
  const color = light?.color;
  if (application.command === 'setColorTemperature') {
    return color?.mode === 'temperature' && color.kelvin === application.args.kelvin;
  }

  return (
    color?.mode === 'color' &&
    Math.round(color.hue) === Math.round(application.args.hue) &&
    Math.round(color.saturation) === Math.round(application.args.saturation)
  );
}
