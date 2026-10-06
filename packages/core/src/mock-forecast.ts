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

/** How much of the sky is cloud under each condition, percent. */
const CLOUD: Partial<Record<WeatherCondition, number>> = {
  sunny: 4,
  'clear-night': 4,
  partlycloudy: 50,
  cloudy: 90,
  fog: 100,
  rainy: 95,
  pouring: 100,
  'lightning-rainy': 100,
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
  // The wind swings round slowly and gusts up with the rain.
  const wind = (step: number) =>
    entity.windSpeed === undefined
      ? {}
      : {
          windSpeed: round(entity.windSpeed * (0.7 + 0.6 * Math.abs(Math.sin(step * 0.7)))),
          windBearing: Math.round(((entity.windBearing ?? 0) + step * 9) % 360),
        };

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
        ...wind(i),
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
        ...wind(i),
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
        ...wind(i),
      });
    }
  }

  // What else a weather source gives for a step, made up from the step itself: it is more humid when
  // cold and cloudy, the sun peaks at noon (or at its day's best, for a whole day) and is dimmed by cloud,
  // and gusts and the feels-like follow the wind.
  const enrich = (point: ForecastPoint): ForecastPoint => {
    const cloud = CLOUD[point.condition] ?? 50;
    const temperature = point.temperature ?? base;
    const hour = new Date(point.timestamp).getHours();
    const sun = query.type === 'daily' ? 1 : Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const rain = RAIN[point.condition] ?? 0;
    return {
      ...point,
      humidity: Math.min(100, Math.max(20, Math.round(85 - (temperature - 5) * 2 + cloud * 0.1))),
      cloudCoverage: cloud,
      uvIndex: point.daytime === false ? 0 : round(sun * 8 * (1 - cloud / 140)),
      apparentTemperature: round(temperature - 1 - (point.windSpeed ?? 0) * 0.05),
      pressure: Math.round(1015 - rain * 0.12 + Math.sin(hour / 4)),
      ...(point.windSpeed !== undefined ? { windGustSpeed: round(point.windSpeed * 1.6) } : {}),
      ...(rain > 50 && point.precipitation === undefined
        ? { precipitation: round(rain / 70) }
        : {}),
    };
  };

  return {
    type: query.type,
    points: points.map(enrich),
    ...(entity.unit ? { unit: entity.unit } : {}),
    ...(entity.precipitationUnit ? { precipitationUnit: entity.precipitationUnit } : {}),
    ...(entity.pressureUnit ? { pressureUnit: entity.pressureUnit } : {}),
    ...(entity.windUnit ? { windUnit: entity.windUnit } : {}),
  };
}
