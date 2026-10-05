import type { HistoryBucket, HistoryRange } from '@hash/core';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How far back each range looks. */
export const RANGE_MS: Record<HistoryRange, number> = {
  '1h': HOUR,
  '1d': DAY,
  '1w': 7 * DAY,
  '1m': 30 * DAY,
};

/** Home Assistant's statistics periods, by the buckets the UI knows. */
export const PERIODS: Record<HistoryBucket, string> = {
  '5m': '5minute',
  '1h': 'hour',
  '1d': 'day',
};

/** A bucket that keeps a chart at a few hundred points whatever the range. */
export const DEFAULT_BUCKET: Record<HistoryRange, HistoryBucket> = {
  '1h': '5m',
  '1d': '5m',
  '1w': '1h',
  '1m': '1h',
};

/** What `recorder/get_statistics_metadata` says about one statistic. */
export interface HaStatisticsMetadata {
  statistic_id: string;
  has_mean: boolean;
  has_sum: boolean;
  statistics_unit_of_measurement?: string | null;
}

/** One bucket of `recorder/statistics_during_period`; `start` is epoch milliseconds. */
export interface HaStatisticsRow {
  start: number;
  mean?: number | null;
  change?: number | null;
}
