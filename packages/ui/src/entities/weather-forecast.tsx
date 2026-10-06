/** @jsxImportSource @emotion/react */
import type { EntityRef, ForecastPoint } from '@hashsome/core';
import { Box, Flex, Typography } from 'e-prim';
import { useEntityHandle } from '../hooks.ts';
import { Icon } from '../icon.tsx';
import { useDetail } from '../layout/detail-provider.tsx';
import { SeriesChart } from '../layout/series-chart.tsx';
import { useWeatherForecast } from '../use-weather-forecast.ts';
import { compass, CONDITION_LABEL, CONDITION_LOOK } from './weather-look.ts';

/** How many hours the chart covers. */
const HOURS = 24;

/** Hours between the labelled points under the chart: more of them in the wide, expanded drawer. */
const EVERY = { collapsed: 4, expanded: 2 };

const degrees = (value: number | undefined) =>
  value === undefined ? '–' : `${Math.round(value)}°`;

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function dayName(iso: string, now: Date): string {
  const date = new Date(iso);
  if (sameDay(date, now)) {
    return 'Today';
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return sameDay(date, tomorrow) ? 'Tomorrow' : date.toLocaleDateString([], { weekday: 'long' });
}

function ConditionIcon({
  condition,
  size,
}: {
  condition: ForecastPoint['condition'];
  size: number;
}) {
  const look = CONDITION_LOOK[condition];
  return (
    <Flex as="span" css={look.color ? { color: look.color } : undefined}>
      <Icon name={look.icon} size={size} />
    </Flex>
  );
}

/** An arrow that points the way the wind blows (it comes from `bearing`, so it points the other way). */
function WindArrow({ bearing, size }: { bearing: number; size: number }) {
  return (
    <Flex as="span" css={{ transform: `rotate(${bearing + 180}deg)` }}>
      <Icon name="lu:arrow-up" size={size} />
    </Flex>
  );
}

/** A weather entity's forecast, for its drawer: the weather now, the next day hour by hour, and the
 * days ahead with how cold and warm each gets. A source with no forecast shows only the weather now. */
export function WeatherForecast({ entity }: { entity: EntityRef }) {
  const handle = useEntityHandle('weather', entity);
  const weather = handle.entity;
  const hourly = useWeatherForecast(
    weather?.forecasts?.includes('hourly') ? entity : undefined,
    'hourly',
  );

  const daily = useWeatherForecast(
    weather?.forecasts?.includes('daily') ? entity : undefined,
    'daily',
  );

  const { detail } = useDetail();
  const expanded = detail?.expanded ?? false;
  const now = new Date();
  const hours = (hourly.result?.points ?? []).slice(0, HOURS);
  const along = hours.filter(
    (_, index) => index % EVERY[expanded ? 'expanded' : 'collapsed'] === 0,
  );

  const days = daily.result?.points ?? [];
  const lows = days.flatMap((day) => (day.low !== undefined ? [day.low] : []));
  const highs = days.flatMap((day) => (day.temperature !== undefined ? [day.temperature] : []));
  const coldest = Math.min(...lows);
  const warmest = Math.max(...highs);
  const span = warmest - coldest;

  return (
    <Flex direction="column" gap={5}>
      <Flex align="center" gap={3}>
        <ConditionIcon condition={weather?.condition ?? 'unknown'} size={40} />
        <Flex direction="column">
          <Typography as="span" variant="heading">
            {degrees(weather?.temperature)}
          </Typography>
          <Typography as="span" variant="secondary" color="textMuted">
            {CONDITION_LABEL[weather?.condition ?? 'unknown']}
            {weather?.humidity !== undefined ? ` · ${Math.round(weather.humidity)}% humidity` : ''}
          </Typography>
          {weather?.windSpeed !== undefined ? (
            <Flex align="center" gap={1} color="textMuted">
              {weather.windBearing !== undefined ? (
                <WindArrow bearing={weather.windBearing} size={12} />
              ) : null}
              <Typography as="span" variant="secondary" color="textMuted">
                Wind {Math.round(weather.windSpeed)}
                {weather.windUnit ? ` ${weather.windUnit}` : ''}
                {weather.windBearing !== undefined ? ` from ${compass(weather.windBearing)}` : ''}
              </Typography>
            </Flex>
          ) : null}
        </Flex>
      </Flex>

      {hours.length > 0 ? (
        <Flex direction="column" gap={1}>
          <Typography as="h3" variant="label" color="textMuted" m={0}>
            Next 24 hours
            {hourly.result?.windUnit && along.some((hour) => hour.windSpeed !== undefined)
              ? ` · wind in ${hourly.result.windUnit}`
              : ''}
          </Typography>
          {/* The temperature as a curve, and under it a few hours along it with their sky and rain
              chance: a day's worth in a strip about as tall as a line of text, not a row of 24 cards. */}
          <SeriesChart
            samples={hours.flatMap((hour) =>
              hour.temperature !== undefined
                ? [{ timestamp: hour.timestamp, value: hour.temperature }]
                : [],
            )}
            range="1d"
            expanded={expanded}
            unit="°"
            fitDomain
            height={expanded ? 180 : 88}
          />
          <Flex justify="space-between" mt={1}>
            {along.map((hour) => (
              <Flex
                key={hour.timestamp}
                direction="column"
                align="center"
                gap={1}
                grow={1}
                css={{ flexBasis: 0 }}
              >
                <Typography as="span" variant="secondary" color="textMuted">
                  {new Date(hour.timestamp).toLocaleTimeString([], { hour: 'numeric' })}
                </Typography>
                <ConditionIcon condition={hour.condition} size={18} />
                <Typography as="span" variant="label">
                  {degrees(hour.temperature)}
                </Typography>
                <Typography as="span" variant="secondary" color="textMuted">
                  {hour.precipitationProbability
                    ? `${Math.round(hour.precipitationProbability)}%`
                    : '\u00a0'}
                </Typography>
                {hour.windSpeed !== undefined ? (
                  <Flex align="center" gap={0.5} color="textMuted">
                    {hour.windBearing !== undefined ? (
                      <WindArrow bearing={hour.windBearing} size={11} />
                    ) : null}
                    <Typography as="span" variant="secondary" color="textMuted">
                      {Math.round(hour.windSpeed)}
                    </Typography>
                  </Flex>
                ) : null}
              </Flex>
            ))}
          </Flex>
        </Flex>
      ) : null}

      {days.length > 0 ? (
        <Flex direction="column" gap={2}>
          <Typography as="h3" variant="label" color="textMuted" m={0}>
            {days.length} days
          </Typography>
          <Flex as="ul" direction="column" gap={1} m={0} p={0} css={{ listStyle: 'none' }}>
            {days.map((day) => (
              <Flex as="li" key={day.timestamp} align="center" gap={3} py={1.5}>
                <Typography as="span" variant="body" width={104} noWrap>
                  {dayName(day.timestamp, now)}
                </Typography>
                <ConditionIcon condition={day.condition} size={20} />
                <Typography as="span" variant="secondary" color="textMuted" width={40}>
                  {day.precipitationProbability
                    ? `${Math.round(day.precipitationProbability)}%`
                    : ''}
                </Typography>
                <Typography
                  as="span"
                  variant="label"
                  color="textMuted"
                  width={36}
                  css={{ textAlign: 'right' }}
                >
                  {degrees(day.low)}
                </Typography>
                <Box
                  grow={1}
                  height={6}
                  radius="full"
                  background="surfaceRaised"
                  position="relative"
                >
                  {span > 0 && day.low !== undefined && day.temperature !== undefined ? (
                    <Box
                      position="absolute"
                      height={6}
                      radius="full"
                      background="accent"
                      css={{
                        left: `${((day.low - coldest) / span) * 100}%`,
                        width: `${((day.temperature - day.low) / span) * 100}%`,
                      }}
                    />
                  ) : null}
                </Box>
                <Typography as="span" variant="label" width={36}>
                  {degrees(day.temperature)}
                </Typography>
              </Flex>
            ))}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  );
}
