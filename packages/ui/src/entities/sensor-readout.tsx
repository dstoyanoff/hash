/** @jsxImportSource @emotion/react */
import type { CSSObject, Theme } from '@emotion/react';
import type { EntityRef } from '@hash/core';
import { Flex, Typography } from 'e-prim';
import type { IconName } from '../icon-data.ts';
import { Icon } from '../icon.tsx';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { SensorHistory, type SensorSample } from '../layout/sensor-history.tsx';
import { PlainButton } from '../layout/plain-button.tsx';
import { DrawerTrigger } from '../layout/use-drawer.tsx';
import { capitalize, statusLabels } from '../status.ts';

/** Bounds a reading is considered safe within; either end can be left open. */
export interface SafeRange {
  min?: number;
  max?: number;
}

export interface SensorReadoutProps {
  /** A sensor, as a ref like `ha:sensor.living_room_humidity` or a handle (a custom source). */
  entity: EntityRef | EntityHandle<'sensor'>;

  /** Icon id. Defaults by device class (temperature, humidity). */
  icon?: IconName;

  /** Drawer title. Defaults to the sensor's name. */
  name?: string;

  /** Readings over time (oldest first). Adds a chart and min/max for today / this week / this month to the drawer, plus a custom date and time range when expanded. No default source yet — pass explicitly. */
  history?: SensorSample[];

  /** Flags readings outside `{ min, max }` with a warning. Humidity defaults to 30–60 %; pass `false` to turn a default off. */
  safeRange?: SafeRange | false;

  /** Tapping a ready numeric reading opens a drawer (current value and safe-range verdict, plus the chart and min/max when `history` is given). Default `true`; `false` keeps it inline text, e.g. for a presence chip. */
  drawer?: boolean;
}

/** What a readout looks like in each state, from its data attributes (`data-range`, `data-status`):
 * red outside its safe range, dimmed while it has no reading. */
const readoutStates = ({ palette }: Theme): CSSObject => ({
  "&[data-range='low'], &[data-range='high']": { color: palette.danger },
  "&[data-status]:not([data-status='ready'])": { opacity: 0.6 },
});

const deviceClassIcons: Record<string, IconName> = {
  temperature: 'lu:thermometer',
  humidity: 'lu:droplet',
};

const DEFAULT_SAFE_RANGES: Record<string, SafeRange> = {
  humidity: { min: 30, max: 60 },
};

type RangeLevel = 'low' | 'high' | 'ok';

function formatValue(raw: string): string {
  const value = Number(raw);
  return raw.trim() !== '' && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : raw;
}

function rangeLevel(raw: string | undefined, range: SafeRange | undefined): RangeLevel | undefined {
  const value = Number(raw);
  if (!range || raw === undefined || raw.trim() === '' || !Number.isFinite(value)) {
    return undefined;
  }

  if (range.min !== undefined && value < range.min) {
    return 'low';
  }

  if (range.max !== undefined && value > range.max) {
    return 'high';
  }

  return 'ok';
}

function describeRange(range: SafeRange, unit: string): string {
  const suffix = unit ? ` ${unit}` : '';
  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min}–${range.max}${suffix}`;
  }

  return range.min !== undefined
    ? `at least ${range.min}${suffix}`
    : `at most ${range.max}${suffix}`;
}

/** Inline value with icon and unit. Shows "Unavailable" / "Unknown" instead of a reading, and a
 * warning when the value leaves its safe range. Tapping a numeric reading opens a drawer. */
export function SensorReadout({
  entity,
  icon,
  name,
  history,
  safeRange,
  drawer = true,
}: SensorReadoutProps) {
  const handle = useEntityHandle('sensor', entity);
  const { status } = handle;
  const sensor = handle.entity;
  const ready = status === 'ready' && sensor !== undefined;
  const deviceClass = sensor?.measurement;
  const unit = sensor?.unit ?? '';
  const resolvedIcon: IconName =
    icon ?? (deviceClass ? deviceClassIcons[deviceClass] : undefined) ?? 'lu:gauge';

  const range =
    safeRange === false
      ? undefined
      : (safeRange ?? (deviceClass ? DEFAULT_SAFE_RANGES[deviceClass] : undefined));

  const level = ready ? rangeLevel(sensor.value, range) : undefined;
  const label = name ?? sensor?.name ?? fallbackName(entity);
  const valueText = ready ? `${formatValue(sensor.value)}${unit ? ` ${unit}` : ''}` : '';

  const warning = level === 'low' || level === 'high';
  const hint =
    warning && range
      ? `${label} is too ${level} (safe range ${describeRange(range, unit)})`
      : undefined;

  const content = (
    <>
      <Icon name={resolvedIcon} size={16} />
      <Typography as="span" variant="body" noWrap>
        {ready ? valueText : statusLabels[status as Exclude<typeof status, 'ready'>]}
      </Typography>
      {warning ? <Icon name="lu:triangle-alert" size={16} /> : null}
    </>
  );

  const numeric = ready && sensor.numeric !== undefined;
  if (drawer && numeric) {
    return (
      <DrawerTrigger
        icon={resolvedIcon}
        label={label}
        kind={deviceClass ? capitalize(deviceClass) : 'Sensor'}
        body={
          <SensorDetailBody
            valueText={valueText}
            level={level}
            range={range}
            unit={unit}
            {...(typeof entity === 'string' ? { entity } : {})}
            {...(history ? { history } : {})}
          />
        }
      >
        {(open) => (
          <PlainButton
            inline
            align="center"
            gap={1}
            css={readoutStates}
            data-status={status}
            data-range={level}
            aria-label={`${label}: ${valueText}${hint ? `. ${hint}` : ''}`}
            title={hint}
            onClick={open}
          >
            {content}
          </PlainButton>
        )}
      </DrawerTrigger>
    );
  }

  return (
    <Flex
      as="span"
      inline
      align="center"
      gap={1}
      css={readoutStates}
      data-status={status}
      data-range={level}
      title={hint}
    >
      {content}
    </Flex>
  );
}

function SensorDetailBody({
  valueText,
  level,
  range,
  unit,
  entity,
  history,
}: {
  valueText: string;
  level: RangeLevel | undefined;
  range: SafeRange | undefined;
  unit: string;
  entity?: EntityRef;
  history?: SensorSample[];
}) {
  const warning = level === 'low' || level === 'high';
  return (
    <Flex direction="column" gap={2}>
      <Flex direction="column" background="surfaceRaised" radius="row" py={3.5} px={4}>
        <Typography as="span" variant="secondary" color="textMuted">
          Now
        </Typography>
        <Typography as="span" variant="stat">
          {valueText}
        </Typography>
        {range ? (
          <Flex
            align="center"
            gap={1.5}
            css={({ palette }) => ({ color: warning ? palette.danger : palette.textMuted })}
          >
            {warning ? <Icon name="lu:triangle-alert" size={14} /> : null}
            <Typography as="span" variant="secondary">
              {warning
                ? `Too ${level} · safe range ${describeRange(range, unit)}`
                : `Within the safe range (${describeRange(range, unit)})`}
            </Typography>
          </Flex>
        ) : null}
      </Flex>
      <SensorHistory {...(history ? { samples: history } : entity ? { entity } : {})} unit={unit} />
    </Flex>
  );
}
