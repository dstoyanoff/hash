import type { EntityBase } from './base.ts';

/** What the sky is doing now. A closed set so a UI can pick an icon for each; anything a backend
 * reports that is not one of these is `unknown`. */
export const WEATHER_CONDITIONS = [
  'sunny',
  'clear-night',
  'partlycloudy',
  'cloudy',
  'fog',
  'rainy',
  'pouring',
  'snowy',
  'snowy-rainy',
  'hail',
  'lightning',
  'lightning-rainy',
  'windy',
  'exceptional',
  'unknown',
] as const;

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

/** Current weather for a place. */
export interface WeatherEntity extends EntityBase<'weather'> {
  condition: WeatherCondition;

  /** In `unit`. Absent when the backend does not report it. */
  temperature?: number;

  /** `°C` or `°F`. */
  unit?: string;

  /** Percent. */
  humidity?: number;
}

export type WeatherCommands = Record<string, never>;
