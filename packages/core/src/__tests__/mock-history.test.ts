import { describe, expect, test } from 'vitest';
import { UnknownEntityError } from '../entity.ts';
import { mockHistory } from '../mock-history.ts';
import { mockLight, mockSensor, MockIntegration } from '../mock.ts';

const NOW = Date.UTC(2026, 9, 5, 12, 0, 0);
const power = {
  ...mockSensor({ value: '40', unit: 'W', measurement: 'power' }),
  ref: 'ha:p',
  kind: 'sensor' as const,
};

const energy = {
  ...mockSensor({ value: '120', unit: 'kWh', measurement: 'energy' }),
  ref: 'ha:e',
  kind: 'sensor' as const,
};

describe('mockHistory', () => {
  test('a reading hovers around its current value, oldest first, ending now', () => {
    const { points, kind, unit } = mockHistory('p', power as never, { range: '1d' }, NOW);
    expect(kind).toBe('measurement');
    expect(unit).toBe('W');
    expect(points).toHaveLength(288);
    expect(points.at(-1)!.timestamp).toBe(new Date(NOW).toISOString());
    expect(points[0]!.timestamp < points[1]!.timestamp).toBe(true);
    for (const point of points) {
      expect(point.value).toBeGreaterThan(40 * 0.5);
      expect(point.value).toBeLessThan(40 * 1.5);
    }
  });

  test('an energy counter answers with what it grew by per bucket', () => {
    const { points, kind } = mockHistory('e', energy as never, { range: '1m', bucket: '1d' }, NOW);
    expect(kind).toBe('total');
    expect(points).toHaveLength(30);
    const week = points.slice(-7).reduce((sum, point) => sum + point.value, 0);
    expect(week).toBeGreaterThan(1);
    expect(week).toBeLessThan(30);
  });

  test('is the same every time for the same device and moment', () => {
    expect(mockHistory('p', power as never, { range: '1w' }, NOW)).toEqual(
      mockHistory('p', power as never, { range: '1w' }, NOW),
    );
  });

  test('has nothing for what is not a numeric sensor', () => {
    expect(mockHistory('l', undefined, { range: '1d' }, NOW).points).toEqual([]);
    expect(
      mockHistory(
        't',
        { ...mockSensor({ value: 'clear' }), ref: 'ha:t', kind: 'sensor' } as never,
        { range: '1d' },
        NOW,
      ).points,
    ).toEqual([]);
  });
});

describe('MockIntegration.history', () => {
  test('answers for a sensor, rejects an unknown entity', async () => {
    const ha = new MockIntegration({
      entities: {
        lamp: mockLight({ name: 'Lamp' }),
        'sensor.lamp_power': mockSensor({ value: '9', unit: 'W', measurement: 'power' }),
      },
    });

    expect((await ha.history('sensor.lamp_power', { range: '1h' })).points).toHaveLength(12);
    expect((await ha.history('lamp', { range: '1h' })).points).toEqual([]);
    await expect(ha.history('missing', { range: '1h' })).rejects.toBeInstanceOf(UnknownEntityError);
  });
});
