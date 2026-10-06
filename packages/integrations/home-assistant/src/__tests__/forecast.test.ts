import { describe, expect, test } from 'vitest';
import { forecastsOf, toForecastPoints } from '../forecast.ts';

describe('forecastsOf', () => {
  test('reads which forecasts the flags allow', () => {
    expect(forecastsOf(1)).toEqual(['daily']);
    expect(forecastsOf(1 | 2)).toEqual(['daily', 'hourly']);
    expect(forecastsOf(1 | 2 | 4)).toEqual(['daily', 'hourly', 'twice_daily']);
    expect(forecastsOf(4)).toEqual(['twice_daily']);
  });

  test('a source without the flags, or with others, has none', () => {
    expect(forecastsOf(undefined)).toEqual([]);
    expect(forecastsOf(0)).toEqual([]);
    expect(forecastsOf(8)).toEqual([]);
  });
});

describe('toForecastPoints', () => {
  test('maps a daily step', () => {
    expect(
      toForecastPoints([
        {
          datetime: '2026-10-06T00:00:00+00:00',
          condition: 'rainy',
          temperature: 14,
          templow: 8.5,
          precipitation: 2.4,
          precipitation_probability: 60,
          wind_speed: 11.2,
        },
      ]),
    ).toEqual([
      {
        timestamp: '2026-10-06T00:00:00.000Z',
        condition: 'rainy',
        temperature: 14,
        low: 8.5,
        precipitation: 2.4,
        precipitationProbability: 60,
        windSpeed: 11.2,
      },
    ]);
  });

  test('maps where the wind comes from, as degrees or a compass name', () => {
    expect(
      toForecastPoints([
        { datetime: '2026-10-06T00:00:00+00:00', wind_speed: 9, wind_bearing: 'E' },
        { datetime: '2026-10-07T00:00:00+00:00', wind_bearing: '200' },
      ]),
    ).toMatchObject([{ windSpeed: 9, windBearing: 90 }, { windBearing: 200 }]);
  });

  test('leaves out what is missing, and calls a condition it does not know unknown', () => {
    expect(
      toForecastPoints([
        { datetime: '2026-10-06T12:00:00+00:00', condition: 'tornado', temperature: null },
        { datetime: '2026-10-06T18:00:00+00:00', is_daytime: false },
      ]),
    ).toEqual([
      { timestamp: '2026-10-06T12:00:00.000Z', condition: 'unknown' },
      { timestamp: '2026-10-06T18:00:00.000Z', condition: 'unknown', daytime: false },
    ]);
  });

  test('drops a step without a usable time, and no rows is no points', () => {
    expect(toForecastPoints([{ condition: 'sunny' }, { datetime: 'soon' }])).toEqual([]);
    expect(toForecastPoints(undefined)).toEqual([]);
  });
});
