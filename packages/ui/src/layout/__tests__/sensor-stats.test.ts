import { expect, test } from 'vitest';
import {
  aggregate,
  downsample,
  fromDateTimeInput,
  periodStart,
  samplesBetween,
  startOfWeek,
  toDateTimeInput,
} from '../sensor-stats.ts';

const at = (iso: string, value = 0) => ({ timestamp: new Date(iso).toISOString(), value });

test('a week starts on the most recent Monday at local midnight', () => {
  // Wednesday 17 June 2026
  expect(startOfWeek(new Date(2026, 5, 17, 12))).toEqual(new Date(2026, 5, 15));
  // A Sunday belongs to the week that began the Monday before.
  expect(startOfWeek(new Date(2026, 5, 21, 9))).toEqual(new Date(2026, 5, 15));
  expect(startOfWeek(new Date(2026, 5, 15, 0, 0))).toEqual(new Date(2026, 5, 15));
});

test('period windows: today, month, and the rolling last 7 / 30 days', () => {
  const now = new Date(2026, 5, 17, 12);
  expect(periodStart('today', now)).toEqual(new Date(2026, 5, 17));
  expect(periodStart('month', now)).toEqual(new Date(2026, 5, 1));
  expect(periodStart('last7d', now)).toEqual(new Date(2026, 5, 10, 12));
  expect(periodStart('last30d', now)).toEqual(new Date(2026, 4, 18, 12));
});

test('aggregate returns min, max and average, or nothing for an empty window', () => {
  expect(aggregate([])).toBeUndefined();
  expect(
    aggregate([at('2026-06-17T10:00', 20), at('2026-06-17T11:00', 22), at('2026-06-17T12:00', 18)]),
  ).toEqual({
    min: 18,
    max: 22,
    avg: 20,
  });
});

test('samplesBetween is inclusive at both ends', () => {
  const samples = [at('2026-06-01T00:00'), at('2026-06-02T00:00'), at('2026-06-03T00:00')];
  const picked = samplesBetween(
    samples,
    new Date('2026-06-01T00:00'),
    new Date('2026-06-02T00:00'),
  );

  expect(picked).toHaveLength(2);
});

test('downsample thins long series and leaves short ones alone', () => {
  const long = Array.from({ length: 1000 }, (_, i) => at('2026-06-01T00:00', i));
  expect(downsample(long, 100).length).toBeLessThanOrEqual(100);
  expect(downsample(long.slice(0, 50), 100)).toHaveLength(50);
});

test('datetime-local values round-trip and reject garbage', () => {
  const date = new Date(2026, 5, 7, 9, 5);
  expect(toDateTimeInput(date)).toBe('2026-06-07T09:05');
  expect(fromDateTimeInput('2026-06-07T09:05')).toEqual(date);
  expect(fromDateTimeInput('2026-06-07')).toBeUndefined();
  expect(fromDateTimeInput('nope')).toBeUndefined();
});
