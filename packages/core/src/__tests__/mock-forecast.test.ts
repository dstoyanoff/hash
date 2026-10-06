import { describe, expect, test } from 'vitest';
import { UnknownEntityError } from '../entity.ts';
import { mockForecast } from '../mock-forecast.ts';
import { mockLight, mockWeather, MockIntegration } from '../mock.ts';

const NOW = new Date(2026, 9, 5, 14, 30).getTime();
const weather = {
  ...mockWeather({ condition: 'rainy', temperature: 12 }),
  ref: 'ha:weather.home',
} as never;

describe('mockForecast', () => {
  test('a daily forecast is ten days with a high, a low and a chance of rain', () => {
    const { type, points, unit } = mockForecast(weather, { type: 'daily' }, NOW);
    expect(type).toBe('daily');
    expect(unit).toBe('°C');
    expect(points).toHaveLength(10);
    for (const point of points) {
      expect(point.temperature!).toBeGreaterThan(point.low!);
      expect(point.precipitationProbability).toBeGreaterThanOrEqual(0);
    }

    // Soonest first, a day apart.
    expect(points[0]!.timestamp < points[1]!.timestamp).toBe(true);
  });

  test('an hourly forecast starts this hour and runs two days', () => {
    const { points } = mockForecast(weather, { type: 'hourly' }, NOW);
    expect(points).toHaveLength(48);
    expect(new Date(points[0]!.timestamp).getHours()).toBe(14);
    expect(new Date(points[0]!.timestamp).getMinutes()).toBe(0);
  });

  test('a twice-daily forecast alternates day and night', () => {
    const { points } = mockForecast(weather, { type: 'twice_daily' }, NOW);
    expect(points.map((point) => point.daytime).slice(0, 4)).toEqual([true, false, true, false]);
  });

  test('starts from the current weather, and is the same every time', () => {
    expect(mockForecast(weather, { type: 'daily' }, NOW).points[0]!.condition).toBe('rainy');
    expect(mockForecast(weather, { type: 'daily' }, NOW)).toEqual(
      mockForecast(weather, { type: 'daily' }, NOW),
    );
  });

  test('has nothing for what is not a weather entity', () => {
    expect(mockForecast(undefined, { type: 'daily' }, NOW).points).toEqual([]);
  });
});

describe('MockIntegration.forecast', () => {
  test('answers for a weather entity, is empty for a light, and rejects an unknown entity', async () => {
    const ha = new MockIntegration({
      entities: { 'weather.home': mockWeather(), lamp: mockLight({ name: 'Lamp' }) },
    });

    expect(ha.getEntity('weather.home')).toMatchObject({ forecasts: ['daily', 'hourly'] });
    expect((await ha.forecast('weather.home', { type: 'daily' })).points).toHaveLength(10);
    expect((await ha.forecast('lamp', { type: 'daily' })).points).toEqual([]);
    await expect(ha.forecast('missing', { type: 'daily' })).rejects.toBeInstanceOf(
      UnknownEntityError,
    );
  });
});
