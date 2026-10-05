import { expect, test } from 'vitest';
import { usageFromDaily } from '../energy-usage.ts';

const day = (iso: string, value: number) => ({ timestamp: new Date(iso).toISOString(), value });

// Wednesday 14 October 2026, mid-afternoon (local time).
const now = new Date(2026, 9, 14, 15, 0);
const points = [
  day('2026-09-10T00:00:00', 9), // before 30 days
  day('2026-09-20T00:00:00', 1), // last 30 days, last month
  day('2026-10-01T00:00:00', 2), // this month, before this week
  day('2026-10-12T00:00:00', 3), // Monday: this week
  day('2026-10-13T00:00:00', 4),
  day('2026-10-14T00:00:00', 5), // today
];

test('today, this week (from Monday) and this month are calendar periods', () => {
  const usage = usageFromDaily(points, now);
  expect(usage.today).toBe(5);
  expect(usage.week).toBe(3 + 4 + 5);
  expect(usage.month).toBe(2 + 3 + 4 + 5);
});

test('the last 7 and 30 days are rolling and include today', () => {
  const usage = usageFromDaily(points, now);
  expect(usage.last7d).toBe(3 + 4 + 5);
  expect(usage.last30d).toBe(1 + 2 + 3 + 4 + 5);
});

test('no points is no usage', () => {
  expect(usageFromDaily([], now)).toEqual({
    today: 0,
    week: 0,
    month: 0,
    last7d: 0,
    last30d: 0,
  });
});
