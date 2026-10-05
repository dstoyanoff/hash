import type { EntityBase } from './base.ts';

export type LightColor =
  | { mode: 'temperature'; kelvin: number }
  | {
      mode: 'color';

      /** 0–360. */
      hue: number;

      /** 0–100. */
      saturation: number;

      /** The color as displayed, when the backend reports it. */
      rgb?: [number, number, number];
    };

export interface LightEntity extends EntityBase<'light'> {
  on: boolean;

  /** 0..1. Absent when the light is not dimmable. */
  brightness?: number;

  /** The current color, when the light has one. */
  color?: LightColor;
  capabilities: {
    brightness: boolean;
    colorTemperature: boolean;
    color: boolean;

    /** The color temperature range in kelvin, when `colorTemperature` is true. */
    kelvinRange?: { min: number; max: number };
  };
}

export interface LightCommands {
  turnOn: void;
  turnOff: void;
  toggle: void;

  /** `brightness` is 0..1; 0 turns the light off. */
  setBrightness: { brightness: number };
  setColorTemperature: { kelvin: number };
  setColor: { hue: number; saturation: number };
}
