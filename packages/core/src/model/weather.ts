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

/** What a forecast looks ahead in: `daily` is a day per point, `hourly` an hour, and `twice_daily` a
 * day and a night. A weather source supports some of them. */
export const FORECAST_TYPES = ['daily', 'hourly', 'twice_daily'] as const;

export type ForecastType = (typeof FORECAST_TYPES)[number];

/** Current weather for a place. */
export interface WeatherEntity extends EntityBase<'weather'> {
  condition: WeatherCondition;

  /** In `unit`. Absent when the backend does not report it. */
  temperature?: number;

  /** `°C` or `°F`. */
  unit?: string;

  /** Percent. */
  humidity?: number;

  /** How hard the wind blows, in `windUnit`. */
  windSpeed?: number;

  /** Where the wind comes from, in degrees: 0 is north, 90 east. */
  windBearing?: number;

  /** `km/h`, `mph`, `m/s`, ... */
  windUnit?: string;

  /** UV index: 0 to 11 and more. */
  uvIndex?: number;

  /** Percent of the sky covered by cloud. */
  cloudCoverage?: number;

  /** What it feels like, in `unit`: the temperature with the wind and humidity counted in. */
  apparentTemperature?: number;

  /** Air pressure, in `pressureUnit`. */
  pressure?: number;

  /** `hPa`, `inHg`, ... */
  pressureUnit?: string;

  /** `mm` or `in`: the unit of the rain a forecast gives. */
  precipitationUnit?: string;

  /** The forecasts the weather source can give, if any. Ask for one with `Client.forecast`. */
  forecasts?: ForecastType[];
}

export interface ForecastQuery {
  type: ForecastType;
}

/** One step of a forecast: a day, an hour, or half a day. */
export interface ForecastPoint {
  /** When the step starts, ISO 8601. */
  timestamp: string;
  condition: WeatherCondition;

  /** The temperature, or the day's high; in the result's `unit`. */
  temperature?: number;

  /** The day's low, for a forecast that covers a whole day. */
  low?: number;

  /** Percent chance of rain or snow. */
  precipitationProbability?: number;

  /** Expected rain or snow, in the result's `precipitationUnit`. */
  precipitation?: number;

  /** In the result's `windUnit`. */
  windSpeed?: number;

  /** Where the wind comes from, in degrees: 0 is north, 90 east. */
  windBearing?: number;

  /** The strongest gusts, in the result's `windUnit`. */
  windGustSpeed?: number;

  /** Percent. */
  humidity?: number;

  /** Percent of the sky covered by cloud. */
  cloudCoverage?: number;

  /** UV index. */
  uvIndex?: number;

  /** What it feels like, in the result's `unit`. */
  apparentTemperature?: number;

  /** Air pressure, in the result's `pressureUnit`. */
  pressure?: number;

  /** For `twice_daily`: whether this step is the day (true) or the night. */
  daytime?: boolean;
}

export interface ForecastResult {
  type: ForecastType;

  /** Soonest first; empty when the source has no forecast of that type. */
  points: ForecastPoint[];

  /** `°C` or `°F`. */
  unit?: string;

  /** The unit of `windSpeed`: `km/h`, `mph`, ... */
  windUnit?: string;

  /** The unit of `precipitation`: `mm` or `in`. */
  precipitationUnit?: string;

  /** The unit of `pressure`: `hPa`, `inHg`, ... */
  pressureUnit?: string;
}

export type WeatherCommands = Record<string, never>;
