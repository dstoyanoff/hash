import { WEATHER_CONDITIONS, type EntityInput, type WeatherCondition } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { forecastsOf } from '../forecast.ts';
import { baseOf, bearing, num, str } from './common.ts';

const isCondition = (state: string): state is WeatherCondition =>
  (WEATHER_CONDITIONS as readonly string[]).includes(state);

/** A `weather.*` entity: its state is the current condition, its attributes the current readings
 * (the forecast is separate, not part of the entity's state: see `forecast()`). */
export function mapWeather(entity: HassEntity): EntityInput {
  const a = entity.attributes;
  const temperature = num(a.temperature);
  const unit = str(a.temperature_unit);
  const humidity = num(a.humidity);
  const windSpeed = num(a.wind_speed);
  const windBearing = bearing(a.wind_bearing);
  const windUnit = str(a.wind_speed_unit);
  const forecasts = forecastsOf(num(a.supported_features));
  return {
    kind: 'weather',
    ...baseOf(entity),
    condition: isCondition(entity.state) ? entity.state : 'unknown',
    ...(temperature !== undefined ? { temperature } : {}),
    ...(unit ? { unit } : {}),
    ...(humidity !== undefined ? { humidity } : {}),
    ...(windSpeed !== undefined ? { windSpeed } : {}),
    ...(windBearing !== undefined ? { windBearing } : {}),
    ...(windUnit ? { windUnit } : {}),
    ...(forecasts.length > 0 ? { forecasts } : {}),
  };
}
