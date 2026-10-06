/** @jsxImportSource @emotion/react */
import { Box, Flex, Typography, useColorByKey } from 'e-prim';
import { useTypographySize } from '../theme/use-typography.ts';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

export interface SeriesSample {
  /** ISO 8601. */
  timestamp: string;
  value: number;

  /** Extra lines the tooltip shows under the value, e.g. the sky and the wind at that hour. */
  notes?: string[];
}

/** The window a chart covers; `custom` is a from/to pair the caller has already applied to the samples. */
export type SeriesRange = '1h' | '1d' | '1w' | '1m' | 'custom';

export function formatTick(range: SeriesRange, iso: string): string {
  const date = new Date(iso);
  if (range === '1h' || range === '1d') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (range === '1w') {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** A bare sparkline, or — when `expanded` — the full chart with axes, grid and a tooltip. Shared by the power and sensor drawers. */
export function SeriesChart({
  samples,
  range,
  expanded,
  unit,
  fitDomain = false,
  height,
}: {
  samples: SeriesSample[];
  range: SeriesRange;
  expanded: boolean;
  unit: string;

  /** Fit the y axis to the data instead of starting at 0 — right for temperature/humidity, wrong for power. */
  fitDomain?: boolean;

  /** The chart's height in px. Default 48 for the sparkline, 220 when expanded. */
  height?: number;
}) {
  const accent = useColorByKey('accent') ?? '';
  const textMuted = useColorByKey('textMuted') ?? '';
  const line = useColorByKey('line') ?? '';
  const tickSize = useTypographySize('secondary');

  return (
    <Box height={height ?? (expanded ? 220 : 48)} mt={3}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={samples} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          {expanded ? (
            <CartesianGrid
              stroke={line}
              strokeOpacity={0.3}
              strokeDasharray="3 3"
              vertical={false}
            />
          ) : null}
          {expanded ? (
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value: string) => formatTick(range, value)}
              tick={{ fontSize: tickSize, fill: textMuted }}
              // The bottom of the chart is a solid line; the grid above it is dashed and lighter.
              axisLine={{ stroke: line, strokeOpacity: 0.5 }}
              tickLine={false}
              minTickGap={24}
            />
          ) : null}
          {expanded ? (
            <YAxis
              width={36}
              {...(fitDomain ? { domain: ['auto', 'auto'] as [string, string] } : {})}
              tick={{ fontSize: tickSize, fill: textMuted }}
              axisLine={false}
              tickLine={false}
            />
          ) : null}
          <Tooltip
            content={<ChartTooltip unit={unit} />}
            // The collapsed sparkline is too short to hold the tooltip, so float it above.
            {...(expanded
              ? {}
              : { allowEscapeViewBox: { x: false, y: true }, position: { y: -52 } })}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={accent}
            fill={accent}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function RangeSwitcher<T extends string>({
  range,
  options,
  onChange,
}: {
  range: T;
  options: { value: T; label: string }[];
  onChange: (range: T) => void;
}) {
  return (
    <Flex background="surfaceRaised" radius="full" p={0.5} gap={0.5}>
      {options.map((option) => {
        const active = option.value === range;
        return (
          <Flex
            as="button"
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            grow={1}
            radius="full"
            cursor="pointer"
            align="center"
            justify="center"
            py={1.25}
            px={2.5}
            background={active ? 'accent' : 'transparent'}
            color={active ? 'accentText' : 'text'}
          >
            <Typography as="span" variant="label">
              {option.label}
            </Typography>
          </Flex>
        );
      })}
    </Flex>
  );
}

function ChartTooltip({
  active,
  payload,
  unit,
}: Partial<TooltipContentProps<number, string>> & { unit: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  const sample = payload[0]?.payload as SeriesSample | undefined;
  if (!sample) {
    return null;
  }

  return (
    <Box
      background="surfaceRaised"
      color="text"
      border
      radius="small"
      typography="body"
      py={1.5}
      px={2.5}
    >
      <Flex direction="column">
        <Typography as="span" variant="secondary" color="textMuted">
          {new Date(sample.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
        <Typography as="span" variant="bodyStrong">
          {Math.round(sample.value * 10) / 10} {unit}
        </Typography>
        {sample.notes?.map((note) => (
          <Typography key={note} as="span" variant="secondary" color="textMuted">
            {note}
          </Typography>
        ))}
      </Flex>
    </Box>
  );
}
