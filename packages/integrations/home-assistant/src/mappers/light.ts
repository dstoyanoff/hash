import type { EntityInput, LightColor } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { baseOf, num, strings } from './common.ts';

const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];

function colorOf(a: Record<string, unknown>): LightColor | undefined {
  const kelvin = num(a.color_temp_kelvin);
  if (a.color_mode === 'color_temp' && kelvin !== undefined) {
    return { mode: 'temperature', kelvin };
  }

  const hs = a.hs_color;
  if (Array.isArray(hs) && typeof hs[0] === 'number' && typeof hs[1] === 'number') {
    const rgb = a.rgb_color;
    return {
      mode: 'color',
      hue: hs[0],
      saturation: hs[1],
      ...(Array.isArray(rgb) && rgb.length >= 3 && rgb.every((n) => typeof n === 'number')
        ? { rgb: [rgb[0], rgb[1], rgb[2]] as [number, number, number] }
        : {}),
    };
  }

  return kelvin !== undefined ? { mode: 'temperature', kelvin } : undefined;
}

export function mapLight(entity: HassEntity): EntityInput {
  const a = entity.attributes;
  const modes = strings(a.supported_color_modes);
  const brightness = num(a.brightness);
  const dimmable = modes.some((mode) => mode !== 'onoff' && mode !== 'unknown');
  const colorTemperature = modes.includes('color_temp');
  const color = colorOf(a);
  return {
    kind: 'light',
    ...baseOf(entity),
    on: entity.state === 'on',
    ...(brightness !== undefined ? { brightness: brightness / 255 } : {}),
    ...(color ? { color } : {}),
    capabilities: {
      brightness: dimmable,
      colorTemperature,
      color: modes.some((mode) => COLOR_MODES.includes(mode)),
      ...(colorTemperature
        ? {
            kelvinRange: {
              min: num(a.min_color_temp_kelvin) ?? 2000,
              max: num(a.max_color_temp_kelvin) ?? 6500,
            },
          }
        : {}),
    },
  };
}
