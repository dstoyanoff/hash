import {
  FORECAST_TYPES,
  WEATHER_CONDITIONS,
  type ForecastPoint,
  type ForecastType,
  type WeatherCondition,
} from '@hashsome/core';

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
    return [
      {
        timestamp: new Date(row.datetime).toISOString(),
        condition: isCondition(row.condition) ? row.condition : 'unknown',
        ...(temperature !== undefined ? { temperature } : {}),
        ...(low !== undefined ? { low } : {}),
        ...(probability !== undefined ? { precipitationProbability: probability } : {}),
        ...(precipitation !== undefined ? { precipitation } : {}),
        ...(wind !== undefined ? { windSpeed: wind } : {}),
        ...(typeof row.is_daytime === 'boolean' ? { daytime: row.is_daytime } : {}),
      },
    ];
  });
}
