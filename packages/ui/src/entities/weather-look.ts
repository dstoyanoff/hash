import type { WeatherCondition } from '@hashsome/core';
import type { IconName } from '../icon-data.ts';

/** What a condition looks like: an icon, and a color where the weather has one. */
export const CONDITION_LOOK: Record<WeatherCondition, { icon: IconName; color?: string }> = {
  sunny: { icon: 'lu:sun', color: '#FBBF24' },
  'clear-night': { icon: 'lu:moon', color: '#A5B4FC' },
  partlycloudy: { icon: 'lu:cloud-sun', color: '#FBBF24' },
  cloudy: { icon: 'lu:cloud' },
  fog: { icon: 'lu:cloud-fog' },
  rainy: { icon: 'lu:cloud-rain', color: '#60A5FA' },
  pouring: { icon: 'lu:cloud-rain-wind', color: '#60A5FA' },
  snowy: { icon: 'lu:cloud-snow', color: '#BAE6FD' },
  'snowy-rainy': { icon: 'lu:cloud-snow', color: '#93C5FD' },
  hail: { icon: 'lu:cloud-hail', color: '#93C5FD' },
  lightning: { icon: 'lu:cloud-lightning', color: '#FBBF24' },
  'lightning-rainy': { icon: 'lu:cloud-lightning', color: '#FBBF24' },
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
