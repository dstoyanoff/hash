import type { SeriesSample } from './series-chart.tsx';

export interface MinMax {
  min: number;
  max: number;
  avg: number;
}

const DAY = 24 * 60 * 60_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local midnight of the most recent Monday. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const sinceMonday = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - sinceMonday);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** The period windows the readout drawer aggregates over; `from` inclusive, `to` is `now`. */
export function periodStart(
  period: 'today' | 'week' | 'month' | 'last7d' | 'last30d',
  now: Date,
): Date {
  switch (period) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now);
    case 'month':
      return startOfMonth(now);
    case 'last7d':
      return new Date(now.getTime() - 7 * DAY);
    case 'last30d':
      return new Date(now.getTime() - 30 * DAY);
  }
}

export function samplesBetween(samples: SeriesSample[], from: Date, to: Date): SeriesSample[] {
  const lo = from.getTime();
  const hi = to.getTime();
  return samples.filter((sample) => {
    const t = Date.parse(sample.timestamp);
    return t >= lo && t <= hi;
  });
}

/** Min / max / average of the samples, or `undefined` when there are none. */
export function aggregate(samples: SeriesSample[]): MinMax | undefined {
  if (samples.length === 0) {
    return undefined;
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const sample of samples) {
    min = Math.min(min, sample.value);
    max = Math.max(max, sample.value);
    sum += sample.value;
  }

  return { min, max, avg: sum / samples.length };
}

/** Thins a long series to at most `limit` points by bucket-averaging, so a month of readings stays cheap to draw. */
export function downsample(samples: SeriesSample[], limit: number): SeriesSample[] {
  if (samples.length <= limit) {
    return samples;
  }

  const size = Math.ceil(samples.length / limit);
  const out: SeriesSample[] = [];
  for (let i = 0; i < samples.length; i += size) {
    const bucket = samples.slice(i, i + size);
    out.push({
      timestamp: bucket[Math.floor(bucket.length / 2)]!.timestamp,
      value: bucket.reduce((sum, s) => sum + s.value, 0) / bucket.length,
    });
  }

  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm` in local time, the value format of `<input type="datetime-local">`. */
export function toDateTimeInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The local time a `YYYY-MM-DDTHH:mm` string names, or `undefined` if it isn't one. */
export function fromDateTimeInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  return match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
      )
    : undefined;
}
