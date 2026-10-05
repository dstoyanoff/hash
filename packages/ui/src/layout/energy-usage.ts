import type { HistoryPoint } from '@hashsome/core';
import type { EnergyUsage } from './energy-chart.tsx';

const DAY = 24 * 60 * 60_000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Energy used per period from how much a counter grew each day (30 days of daily buckets).
 * Today, this week (from Monday) and this month are calendar periods; the rolling 7 and 30 days
 * include today. */
export function usageFromDaily(points: HistoryPoint[], now: Date): EnergyUsage {
  const today = startOfDay(now).getTime();
  const sumSince = (from: number) =>
    points.reduce(
      (total, point) => (Date.parse(point.timestamp) >= from ? total + point.value : total),
      0,
    );

  const monday = today - ((now.getDay() + 6) % 7) * DAY;
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return {
    today: sumSince(today),
    week: sumSince(monday),
    month: sumSince(month),
    last7d: sumSince(today - 6 * DAY),
    last30d: sumSince(today - 29 * DAY),
  };
}
