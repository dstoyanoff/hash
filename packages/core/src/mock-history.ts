import type {
  Entity,
  HistoryBucket,
  HistoryPoint,
  HistoryQuery,
  HistoryRange,
  HistoryResult,
} from './model/index.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const SPAN: Record<HistoryRange, number> = { '1h': HOUR, '1d': DAY, '1w': 7 * DAY, '1m': 30 * DAY };
const BUCKET: Record<HistoryBucket, number> = { '5m': 5 * MINUTE, '1h': HOUR, '1d': DAY };
const DEFAULT_BUCKET: Record<HistoryRange, HistoryBucket> = {
  '1h': '5m',
  '1d': '5m',
  '1w': '1h',
  '1m': '1h',
};

/** A number in [0, 1) that is the same for the same text, so a mock device always has the same past. */
function seed(text: string): number {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.codePointAt(0)!) % 100_003;
  }

  return hash / 100_003;
}

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/**
 * Made-up but believable history for a numeric mock sensor, so the charts a real backend would fill
 * have something to show: a daily rhythm (more in the evening), a slower drift over the days and a
 * little jitter. A reading (a temperature, power) hovers around the sensor's current value; an
 * `energy` counter (kWh or Wh) answers with how much it grew in each bucket. Nothing else has any.
 * `now` is a parameter so a test can pin it.
 */
export function mockHistory(
  entityId: string,
  entity: Entity | undefined,
  query: HistoryQuery,
  now: number = Date.now(),
): HistoryResult {
  if (entity?.kind !== 'sensor' || entity.numeric === undefined) {
    return { points: [], kind: 'measurement' };
  }

  const total = entity.measurement === 'energy' || entity.unit === 'kWh' || entity.unit === 'Wh';
  const bucket = BUCKET[query.bucket ?? DEFAULT_BUCKET[query.range]];
  const count = Math.ceil(SPAN[query.range] / bucket);
  const end = Math.floor(now / bucket) * bucket;
  const phase = seed(entityId);

  // How busy the device is at a time: 0 to 1.
  const level = (time: number) => {
    const hours = (time % DAY) / HOUR;
    const daily = 0.5 + 0.5 * Math.sin(((hours - 9) / 24) * 2 * Math.PI);
    const drift = 0.15 * Math.sin((time / DAY) * 1.3 + phase * 6);
    const jitter = 0.015 * Math.sin((time / bucket) * 1.7 + phase * 9);
    return Math.min(1, Math.max(0, daily + drift + jitter));
  };

  // What a counter grows by in a day: about 0.6 to 1.8 kWh, and the same in Wh.
  const perDay = (0.6 + 1.2 * phase) * (entity.unit === 'Wh' ? 1000 : 1);

  const points: HistoryPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = end - i * bucket;
    points.push({
      timestamp: new Date(start).toISOString(),
      value: total
        ? round((perDay / 24) * (bucket / HOUR) * (0.4 + 1.2 * level(start)), 3)
        : round(entity.numeric * (0.55 + 0.9 * level(start)), 1),
    });
  }

  return {
    points,
    kind: total ? 'total' : 'measurement',
    ...(entity.unit ? { unit: entity.unit } : {}),
  };
}
