import {
  FORECAST_TYPES,
  WEATHER_CONDITIONS,
  type ForecastPoint,
  type ForecastType,
  type WeatherCondition,
} from '@hashsome/core';
import { bearing } from './mappers/common.ts';

/** `WeatherEntityFeature`: which forecasts a weather entity can give, as flags in `supported_features`. */
const FEATURES: Record<ForecastType, number> = { daily: 1, hourly: 2, twice_daily: 4 };

/** The forecasts a weather entity says it supports. */
export function forecastsOf(supportedFeatures: number | undefined): ForecastType[] {
  const features = supportedFeatures ?? 0;
  return FORECAST_TYPES.filter((type) => (features & FEATURES[type]) !== 0);
}

/** One step of `weather.get_forecasts`' answer; every field but the time may be missing. */
export interface HaForecastRow {
  datetime?: string;
  condition?: string;
  temperature?: number | null;
  templow?: number | null;
  precipitation?: number | null;
  precipitation_probability?: number | null;
  wind_speed?: number | null;
  wind_bearing?: number | string | null;
  wind_gust_speed?: number | null;
  humidity?: number | null;
  cloud_coverage?: number | null;
  uv_index?: number | null;
  apparent_temperature?: number | null;
  pressure?: number | null;
  is_daytime?: boolean | null;
}

/** What `weather.get_forecasts` answers: the forecast of each entity asked about. */
export type HaForecastResponse = Record<string, { forecast?: HaForecastRow[] }>;

const isCondition = (value: string | undefined): value is WeatherCondition =>
  value !== undefined && (WEATHER_CONDITIONS as readonly string[]).includes(value);

const number = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** The steps of a forecast as the generic model, dropping any without a usable time. */
export function toForecastPoints(rows: HaForecastRow[] | undefined): ForecastPoint[] {
  return (rows ?? []).flatMap((row) => {
    if (typeof row.datetime !== 'string' || Number.isNaN(Date.parse(row.datetime))) {
      return [];
    }

    const temperature = number(row.temperature);
    const low = number(row.templow);
    const probability = number(row.precipitation_probability);
    const precipitation = number(row.precipitation);
    const wind = number(row.wind_speed);
    const windBearing = bearing(row.wind_bearing);
    const gust = number(row.wind_gust_speed);
    const humidity = number(row.humidity);
    const clouds = number(row.cloud_coverage);
    const uv = number(row.uv_index);
    const feels = number(row.apparent_temperature);
    const pressure = number(row.pressure);
    return [
      {
        timestamp: new Date(row.datetime).toISOString(),
        condition: isCondition(row.condition) ? row.condition : 'unknown',
        ...(temperature !== undefined ? { temperature } : {}),
        ...(low !== undefined ? { low } : {}),
        ...(probability !== undefined ? { precipitationProbability: probability } : {}),
        ...(precipitation !== undefined ? { precipitation } : {}),
        ...(wind !== undefined ? { windSpeed: wind } : {}),
        ...(windBearing !== undefined ? { windBearing } : {}),
        ...(gust !== undefined ? { windGustSpeed: gust } : {}),
        ...(humidity !== undefined ? { humidity } : {}),
        ...(clouds !== undefined ? { cloudCoverage: clouds } : {}),
        ...(uv !== undefined ? { uvIndex: uv } : {}),
        ...(feels !== undefined ? { apparentTemperature: feels } : {}),
        ...(pressure !== undefined ? { pressure } : {}),
        ...(typeof row.is_daytime === 'boolean' ? { daytime: row.is_daytime } : {}),
      },
    ];
  });
}
