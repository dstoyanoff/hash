import type {
  Entity,
  ForecastPoint,
  ForecastQuery,
  ForecastResult,
  ForecastType,
  WeatherCondition,
} from './model/index.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A spell of weather the made-up days run through, so a forecast is not one flat condition. */
const SPELL: WeatherCondition[] = [
  'sunny',
  'partlycloudy',
  'cloudy',
  'rainy',
  'pouring',
  'partlycloudy',
  'sunny',
  'sunny',
  'cloudy',
  'fog',
];

/** How likely rain is under each condition, percent. */
const RAIN: Partial<Record<WeatherCondition, number>> = {
  cloudy: 15,
  fog: 10,
  rainy: 70,
  pouring: 95,
  'lightning-rainy': 90,
  'snowy-rainy': 80,
};

const STEPS: Record<ForecastType, number> = { daily: 10, hourly: 48, twice_daily: 14 };

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * A made-up but believable forecast for a mock weather entity, so the UI that a real source feeds
 * has something to show: a spell of weather moving through, warmer afternoons and colder nights
 * around the entity's current temperature. The same every time for the same entity and moment (`now`
 * is a parameter so a test can pin it). Anything that is not a weather entity has none.
 */
export function mockForecast(
  entity: Entity | undefined,
  query: ForecastQuery,
  now: number = Date.now(),
): ForecastResult {
  if (entity?.kind !== 'weather') {
    return { type: query.type, points: [] };
  }

  const base = entity.temperature ?? 15;
  const start = new Date(now);
  const points: ForecastPoint[] = [];
  const spellAt = (step: number) =>
    SPELL[(step + Math.max(0, SPELL.indexOf(entity.condition))) % SPELL.length]!;

  if (query.type === 'hourly') {
    start.setMinutes(0, 0, 0);
    for (let i = 0; i < STEPS.hourly; i += 1) {
      const time = new Date(start.getTime() + i * HOUR);
      const hours = time.getHours();
      const condition = spellAt(Math.floor(i / 8));
      const night = hours < 6 || hours >= 21;
      points.push({
        timestamp: time.toISOString(),
        condition: night && condition === 'sunny' ? 'clear-night' : condition,
        temperature: round(base + 4 * Math.sin(((hours - 9) / 24) * 2 * Math.PI) - i * 0.05),
        precipitationProbability: RAIN[condition] ?? 0,
      });
    }
  } else if (query.type === 'twice_daily') {
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < STEPS.twice_daily; i += 1) {
      const daytime = i % 2 === 0;
      const condition = spellAt(Math.floor(i / 2));
      points.push({
        timestamp: new Date(
          start.getTime() + i * 12 * HOUR + (daytime ? 6 * HOUR : 0),
        ).toISOString(),
        condition: !daytime && condition === 'sunny' ? 'clear-night' : condition,
        temperature: round(daytime ? base + 4 + Math.sin(i) : base - 4 + Math.sin(i)),
        precipitationProbability: RAIN[condition] ?? 0,
        daytime,
      });
    }
  } else {
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < STEPS.daily; i += 1) {
      const condition = spellAt(i);
      const drift = 2 * Math.sin(i * 1.3);
      points.push({
        timestamp: new Date(start.getTime() + i * DAY).toISOString(),
        condition,
        temperature: round(base + 3 + drift),
        low: round(base - 5 + drift),
        precipitationProbability: RAIN[condition] ?? 0,
        ...(RAIN[condition] ? { precipitation: round((RAIN[condition] ?? 0) / 12) } : {}),
      });
    }
  }

  return {
    type: query.type,
    points,
    ...(entity.unit ? { unit: entity.unit } : {}),
  };
}
