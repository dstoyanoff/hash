import type { WeatherCondition } from '@hashsome/core';
import type { IconName } from '../icon-data.ts';

const SUN = '#FBBF24';
const CLOUD = '#60A5FA';
const RAIN = '#3B82F6';
const SNOW = '#7DD3FC';

/** What a condition looks like: an icon, and the colors it is drawn in. */
export interface ConditionLook {
  icon: IconName;

  /** The color of every part of the icon that `parts` does not name; the surrounding text color when left out. */
  color?: string;

  /** Colors by part of the icon (its `i`th shape), for one drawn in two colors: the cloud blue and the sun yellow. */
  parts?: Record<number, string>;
}

export const CONDITION_LOOK: Record<WeatherCondition, ConditionLook> = {
  sunny: { icon: 'lu:sun', color: SUN },
  'clear-night': { icon: 'lu:moon', color: '#A5B4FC' },
  // The cloud is the last shape of `cloud-sun`; the rest is the sun.
  partlycloudy: { icon: 'lu:cloud-sun', color: SUN, parts: { 5: CLOUD } },
  cloudy: { icon: 'lu:cloud', color: CLOUD },
  fog: { icon: 'lu:cloud-fog', parts: { 0: CLOUD } },
  rainy: { icon: 'lu:cloud-rain', color: RAIN, parts: { 0: CLOUD } },
  pouring: { icon: 'lu:cloud-rain-wind', color: RAIN, parts: { 0: CLOUD } },
  snowy: { icon: 'lu:cloud-snow', color: SNOW, parts: { 0: CLOUD } },
  'snowy-rainy': { icon: 'lu:cloud-snow', color: RAIN, parts: { 0: CLOUD } },
  hail: { icon: 'lu:cloud-hail', color: SNOW, parts: { 0: CLOUD } },
  lightning: { icon: 'lu:cloud-lightning', color: SUN, parts: { 0: CLOUD } },
  'lightning-rainy': { icon: 'lu:cloud-lightning', color: SUN, parts: { 0: CLOUD } },
  windy: { icon: 'lu:wind' },
  exceptional: { icon: 'lu:triangle-alert', color: '#F2554A' },
  unknown: { icon: 'lu:cloud' },
};

/** A condition in words. */
export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  sunny: 'Sunny',
  'clear-night': 'Clear',
  partlycloudy: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  rainy: 'Rain',
  pouring: 'Heavy rain',
  snowy: 'Snow',
  'snowy-rainy': 'Sleet',
  hail: 'Hail',
  lightning: 'Thunderstorm',
  'lightning-rainy': 'Thunderstorm with rain',
  windy: 'Windy',
  exceptional: 'Exceptional weather',
  unknown: 'Unknown',
};

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

/** The compass point for a bearing in degrees: `225` is `SW`. */
export function compass(degrees: number): string {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16]!;
}
