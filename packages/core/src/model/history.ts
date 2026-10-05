/** How far back a history query looks. */
export type HistoryRange = '1h' | '1d' | '1w' | '1m';

/** How coarse the points are. Left out, the integration picks one that suits the range. */
export type HistoryBucket = '5m' | '1h' | '1d';

export interface HistoryQuery {
  range: HistoryRange;
  bucket?: HistoryBucket;
}

export interface HistoryPoint {
  /** The start of the bucket, ISO 8601. */
  timestamp: string;

  /** What a reading was over the bucket: its average for a measurement (a temperature, power), or how much it
   * grew for a running total (energy used in that bucket). */
  value: number;
}

export interface HistoryResult {
  /** Oldest first; empty when the backend keeps no history for the entity. */
  points: HistoryPoint[];

  /** `total` when each value is how much the counter grew in that bucket, `measurement` when it is
   * the reading itself. */
  kind: 'measurement' | 'total';
  unit?: string;
}
