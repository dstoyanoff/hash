/** @jsxImportSource @emotion/react */
import { Flex, Typography } from 'e-prim';
import { LocalClient } from '@hashsome/core';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActionButton } from '../entities/action-button.tsx';
import { ClimateTile } from '../entities/climate-tile.tsx';
import { LightTile } from '../entities/light-tile.tsx';
import { MediaBrowser } from '../entities/media-browser.tsx';
import { MediaPlayerBar } from '../entities/media-player-bar.tsx';
import { MediaPlayerColumn } from '../entities/media-player-column.tsx';
import { MediaPlayerFull } from '../entities/media-player-full.tsx';
import { WeatherForecast } from '../entities/weather-forecast.tsx';
import { NavDock } from '../entities/nav-dock.tsx';
import { NavRail } from '../entities/nav-rail.tsx';
import { Page } from '../layout/page.tsx';
import { SceneButton } from '../entities/scene-button.tsx';
import { SensorReadout } from '../entities/sensor-readout.tsx';
import { PresenceStack, SystemStatus, TopBar } from '../entities/top-bar.tsx';
import { Icon } from '../icon.tsx';
import {
  EnergyChart,
  type EnergyRange,
  type EnergySample,
  type EnergyUsage,
} from '../layout/energy-chart.tsx';
import { Grid } from '../layout/grid.tsx';
import { HistorySection } from '../layout/history-section.tsx';
import { RoomHeader } from '../layout/room-header.tsx';
import { Tile } from '../layout/tile.tsx';
import type { LogbookEntry } from '../layout/history-section.tsx';
import { HashsomeProvider } from '../provider.tsx';
import { createGalleryIntegration } from './fixtures.ts';
import { COMPONENT_PROPS } from './props-data.ts';

const ICON_PACKS = [
  { name: 'Lucide', prefix: 'lu', href: 'https://lucide.dev/icons/' },
  { name: 'Tabler', prefix: 'tb', href: 'https://tabler.io/icons' },
];

const NAV_ITEMS = [
  { to: '', label: 'Home', icon: 'lu:house' as const },
  { to: 'lights', label: 'Lights', icon: 'lu:lightbulb' as const },
  { to: 'climate', label: 'Climate', icon: 'lu:thermometer' as const },
  { to: 'music', label: 'Music', icon: 'lu:music' as const },
];

const codeStyles = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  overflowWrap: 'anywhere',
} as const;

/** A bounded "stage" card rendering real `@hashsome/ui` components on the app background, so the demos
 * read as they would on a dashboard against the gallery's own page chrome. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <Flex
      direction="column"
      gap={3}
      background="bg"
      color="text"
      radius="card"
      p={8}
      minHeight={72}
    >
      {children}
    </Flex>
  );
}

/** One documented component: a heading, a one-line description, and a `Stage` demoing its
 * supported states — interactive, not just a static picture. */
/** A component's props, read from its own prop interface and doc comments (`props-data.ts`, generated
 * by `pnpm generate:catalog`), so what's listed here is exactly what the IDE shows on hover. */
function PropsTable({ name }: { name: string }) {
  const entry = COMPONENT_PROPS[name];
  if (!entry || entry.props.length === 0) {
    return null;
  }

  return (
    <details
      css={({ palette }) => ({
        marginTop: 12,
        '& summary': { cursor: 'pointer', padding: '4px 0' },
        '& table': { width: '100%', marginTop: 8, borderCollapse: 'collapse' },
        '& th, & td': {
          padding: '8px 12px 8px 0',
          textAlign: 'left',
          verticalAlign: 'top',
          borderBottom: `1px solid ${palette.border}`,
        },
      })}
    >
      <summary>
        <Typography as="span" variant="label" color="textMuted">
          Props · {name} ({entry.props.length})
        </Typography>
      </summary>
      <table>
        <thead>
          <tr>
            {['Prop', 'Type', 'Description'].map((heading) => (
              <th key={heading} scope="col">
                <Typography as="span" variant="eyebrow" uppercase color="textMuted">
                  {heading}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entry.props.map((prop) => (
            <tr key={prop.name}>
              <td>
                <Typography as="span" variant="label" css={codeStyles}>
                  {prop.name}
                  {prop.optional ? '' : ' *'}
                </Typography>
              </td>
              <td>
                <Typography as="span" variant="secondary" color="textMuted" css={codeStyles}>
                  {prop.type}
                </Typography>
              </td>
              <td>
                <Typography as="span" variant="body" color="textMuted">
                  {prop.doc}
                </Typography>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function ComponentDoc({
  title,
  description,
  components,
  children,
}: {
  title: string;
  description: string;

  /** Names of the components this section documents; each gets a props table under the demo. */
  components: string[];
  children: ReactNode;
}) {
  return (
    <section css={{ marginBottom: 40 }}>
      <Flex direction="column" gap={1} maxWidth="60ch" mb={4}>
        <Typography as="h2" variant="heading">
          {title}
        </Typography>
        <Typography as="p" variant="body" color="textMuted">
          {description}
        </Typography>
      </Flex>
      <Stage>{children}</Stage>
      {components.map((name) => (
        <PropsTable key={name} name={name} />
      ))}
    </section>
  );
}

/** Plain dimmable tile whose fill follows a local value, since `Tile` itself is controlled. */
function TileFillDemo() {
  const [fill, setFill] = useState(0.6);
  return (
    <Tile
      label="With fill"
      icon="lu:sun"
      active
      fill={fill}
      onFillChange={setFill}
      secondary={`${Math.round(fill * 100)}%`}
    />
  );
}

/** A labeled sub-preview within a `Stage`, for a component that isn't itself a tile (e.g. nav
 * chrome). `NavDock` is `position: fixed`, which a plain wrapper can't contain — `transform` on
 * an ancestor makes it establish a containing block for fixed-position descendants instead (a
 * standard CSS escape hatch), confining it to this box instead of the real viewport. */
function SubPreview({
  label,
  height,
  children,
}: {
  label: string;
  height: number;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap={2}>
      <Typography as="span" variant="eyebrow" uppercase color="textMuted">
        {label}
      </Typography>
      <Flex
        position="relative"
        overflow="hidden"
        radius="row"
        border
        height={height}
        css={{ transform: 'translateZ(0)' }}
      >
        {children}
      </Flex>
    </Flex>
  );
}

// Hand-written activity, to show the drawer's History section through the `history` prop. Tiles
// without it (and with a backend that keeps a record) fetch their own.
const lampHistory: LogbookEntry[] = [
  {
    id: '1',
    message: 'turned on',
    actor: 'Dan',
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: '2',
    message: 'turned off',
    actor: 'automation.bedtime',
    actorKind: 'automation',
    timestamp: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: '3',
    message: 'turned on',
    actor: 'Dan',
    timestamp: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  },
];

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const stairsHistory: LogbookEntry[] = [
  {
    id: '1',
    message: 'turned off',
    actor: 'automation.bedtime',
    actorKind: 'automation',
    timestamp: ago(45),
  },
  { id: '2', message: 'turned on', actor: 'Alex', timestamp: ago(4 * 60) },
  { id: '3', message: 'turned off', actor: 'Alex', timestamp: ago(9 * 60) },
];

const ledHistory: LogbookEntry[] = [
  { id: '1', message: 'brightness set to 60%', actor: 'Dan', timestamp: ago(12) },
  { id: '2', message: 'turned on', actor: 'Dan', timestamp: ago(14) },
  {
    id: '3',
    message: 'turned off',
    actor: 'automation.morning_routine',
    actorKind: 'automation',
    timestamp: ago(6 * 60),
  },
];

const heaterHistory: LogbookEntry[] = [
  { id: '1', message: 'target set to 17 °C', actor: 'Dan', timestamp: ago(25) },
  {
    id: '2',
    message: 'mode set to heat',
    actor: 'automation.morning_routine',
    actorKind: 'automation',
    timestamp: ago(7 * 60),
  },
  { id: '3', message: 'mode set to off', actor: 'Alex', timestamp: ago(14 * 60) },
];

const nightLampHistory: LogbookEntry[] = [
  {
    id: '1',
    message: 'turned off',
    actor: 'automation.bedtime',
    actorKind: 'automation',
    timestamp: ago(30),
  },
  { id: '2', message: 'color changed', actor: 'Alex', timestamp: ago(90) },
  { id: '3', message: 'turned on', actor: 'Alex', timestamp: ago(2 * 60) },
];

// Same story as the history demo data above — no real integration exposes energy history yet
// (see the same ticket); a small deterministic wave stands in so the chart has something to show.
function generateSeries(points: number, intervalMs: number, base: number, amplitude: number) {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    timestamp: new Date(now - (points - 1 - i) * intervalMs).toISOString(),
    watts: Math.max(
      0,
      Math.round(base + amplitude * Math.sin(i / 3) + Math.sin(i * 7) * amplitude * 0.15),
    ),
  }));
}

const lampEnergyByRange: Partial<Record<EnergyRange, EnergySample[]>> = {
  '1h': generateSeries(30, 2 * 60_000, 9, 2),
  '1d': generateSeries(48, 30 * 60_000, 8, 4),
  '1w': generateSeries(28, 6 * 60 * 60_000, 7, 5),
  '1m': generateSeries(30, 24 * 60 * 60_000, 8, 6),
};

// Demo usage totals (kWh) — real ones need a history/statistics source no integration provides yet.
const lampUsage = { today: 0.18, week: 1.1, month: 4.7, last7d: 1.3, last30d: 5.2 };

/** Mock live data for the lamp's power sensor: a small random walk every few seconds, also
 * appended to the 1H series, so the drawer's headline and sparkline visibly move. */
function useLiveLampEnergy(ha: ReturnType<typeof createGalleryIntegration>) {
  const [oneHour, setOneHour] = useState(lampEnergyByRange['1h'] ?? []);

  useEffect(() => {
    let watts = 9;
    const id = setInterval(() => {
      watts = Math.min(14, Math.max(5, Math.round(watts + (Math.random() - 0.5) * 3)));
      ha.update('sensor.lamp_power', { value: String(watts), numeric: watts });
      setOneHour((series) =>
        [...series, { timestamp: new Date().toISOString(), watts }].slice(-60),
      );
    }, 2500);

    return () => clearInterval(id);
  }, [ha]);

  return useMemo(
    () => ({
      power: 'ha:sensor.lamp_power' as const,
      energy: 'ha:sensor.lamp_energy' as const,
      usage: lampUsage,
      seriesByRange: { ...lampEnergyByRange, '1h': oneHour },
    }),
    [oneHour],
  );
}

/** Mock power for a climate entity: near `maxWatts` (with a little jitter) while it isn't off, 0
 * while it is — re-evaluated on every mode change and every few seconds, so switching a mode in the
 * card or drawer visibly moves the drawer's power reading. */
function useClimateEnergy(
  ha: ReturnType<typeof createGalleryIntegration>,
  config: {
    entity: string;
    power: string;
    energy: string;
    maxWatts: number;
    series: Partial<Record<EnergyRange, EnergySample[]>>;
    usage: EnergyUsage;
  },
) {
  const { entity, power, energy, maxWatts, series, usage } = config;
  const [oneHour, setOneHour] = useState(series['1h'] ?? []);

  useEffect(() => {
    const tick = () => {
      const device = ha.getEntity(entity);
      const off = device?.kind === 'climate' && device.mode === 'off';
      const watts = off ? 0 : Math.round(maxWatts * (0.9 + Math.random() * 0.2));
      ha.update(power, { value: String(watts), numeric: watts });
      setOneHour((points) =>
        [...points, { timestamp: new Date().toISOString(), watts }].slice(-60),
      );
    };

    const unsubscribe = ha.subscribe(entity, tick);
    const id = setInterval(tick, 2500);
    return () => {
      unsubscribe();
      clearInterval(id);
    };
  }, [ha, entity, power, maxWatts]);

  return useMemo(
    () => ({
      power: `ha:${power}` as const,
      energy: `ha:${energy}` as const,
      usage,
      seriesByRange: { ...series, '1h': oneHour },
    }),
    [power, energy, usage, series, oneHour],
  );
}

const heaterSeries: Partial<Record<EnergyRange, EnergySample[]>> = {
  '1h': generateSeries(30, 2 * 60_000, 1180, 140),
  '1d': generateSeries(48, 30 * 60_000, 700, 600),
  '1w': generateSeries(28, 6 * 60 * 60_000, 600, 500),
  '1m': generateSeries(30, 24 * 60 * 60_000, 650, 450),
};

const thermostatSeries: Partial<Record<EnergyRange, EnergySample[]>> = {
  '1h': generateSeries(30, 2 * 60_000, 20, 20),
  '1d': generateSeries(48, 30 * 60_000, 500, 450),
  '1w': generateSeries(28, 6 * 60 * 60_000, 450, 400),
  '1m': generateSeries(30, 24 * 60 * 60_000, 480, 380),
};

const heaterUsage = { today: 6.2, week: 38, month: 142, last7d: 41, last30d: 148 };
const thermostatUsage = { today: 0.9, week: 11.5, month: 47, last7d: 12.3, last30d: 49 };

// Demo sensor history — no integration exposes it yet (same ticket). 35 days at 30-minute spacing,
// a daily cycle plus a slower drift, so every period (today / week / month / custom) has data.
function generateSensorHistory(
  base: number,
  daily: number,
  drift: number,
): { timestamp: string; value: number }[] {
  const step = 30 * 60_000;
  const count = 35 * 48;
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - 1 - i) * step;
    const hours = (t / 3_600_000) % 24;
    const days = t / 86_400_000;
    const value =
      base +
      daily * Math.sin((hours / 24) * 2 * Math.PI) +
      drift * Math.sin(days / 2.3) +
      Math.sin(i * 1.7) * 0.4;

    return { timestamp: new Date(t).toISOString(), value: Math.round(value * 10) / 10 };
  });
}

const temperatureHistory = generateSensorHistory(19.5, 2.2, 1.6);
const humidityHistory = generateSensorHistory(52, 9, 11);
const bedroomHumidityHistory = generateSensorHistory(34, 7, 6);
const officeHumidityHistory = generateSensorHistory(46, 5, 4);

const LED_MAX_WATTS = 12;

/** Mock power for the dimmable LED strip that tracks its brightness: watts scale with the
 * brightness percentage (0 when off), so dragging the slider visibly moves the reading. */
function useBrightnessLinkedEnergy(ha: ReturnType<typeof createGalleryIntegration>) {
  const [oneHour, setOneHour] = useState(() => generateSeries(30, 2 * 60_000, 7, 1));

  useEffect(
    () =>
      ha.subscribe('light.dimmable', (light) => {
        const on = light?.kind === 'light' && light.on;
        const watts = on ? Math.round((light.brightness ?? 1) * LED_MAX_WATTS) : 0;
        ha.update('sensor.led_power', { value: String(watts), numeric: watts });
        setOneHour((series) =>
          [...series, { timestamp: new Date().toISOString(), watts }].slice(-60),
        );
      }),
    [ha],
  );

  return useMemo(
    () => ({
      power: 'ha:sensor.led_power' as const,
      energy: 'ha:sensor.led_energy' as const,
      usage: { today: 0.09, week: 0.62, month: 2.4, last7d: 0.7, last30d: 2.6 },
      seriesByRange: { ...lampEnergyByRange, '1h': oneHour },
    }),
    [oneHour],
  );
}

/**
 * Documentation for every `@hashsome/ui` component: what it is and the states it supports, each a
 * live, interactive demo backed by an in-browser mock — not a dashboard itself (that's what
 * `example/dashboards/*` are for). Served standalone by `pnpm --filter @hashsome/ui docs`. Must
 * be rendered inside a router (nav components use router links).
 */
export function Gallery({ density = 'comfortable' }: { density?: 'comfortable' | 'compact' }) {
  const ha = useMemo(() => createGalleryIntegration(), []);
  const client = useMemo(() => new LocalClient([ha]), [ha]);
  const lampEnergy = useLiveLampEnergy(ha);
  const ledEnergy = useBrightnessLinkedEnergy(ha);
  const heaterEnergy = useClimateEnergy(ha, {
    entity: 'climate.heater',
    power: 'sensor.heater_power',
    energy: 'sensor.heater_energy',
    maxWatts: 1200,
    series: heaterSeries,
    usage: heaterUsage,
  });

  const thermostatEnergy = useClimateEnergy(ha, {
    entity: 'climate.off',
    power: 'sensor.thermostat_power',
    energy: 'sensor.thermostat_energy',
    maxWatts: 1500,
    series: thermostatSeries,
    usage: thermostatUsage,
  });

  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  return (
    <HashsomeProvider client={client} theme={mode} density={density}>
      <div
        css={({ palette }) => ({
          background: palette.surfaceRaised,
          color: palette.text,
          minHeight: '100%',
          padding: '32px 20px 64px',
        })}
      >
        <div css={{ maxWidth: 960, margin: '0 auto' }}>
          <header
            css={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 36,
            }}
          >
            <Flex direction="column" gap={1.5} maxWidth="60ch">
              <Typography as="h1" variant="stat">
                @hashsome/ui component gallery
              </Typography>
              <Typography as="p" variant="body" color="textMuted">
                Every component `@hashsome/ui` ships, with the states it supports — a live,
                interactive reference for building a dashboard, not a dashboard of its own.
              </Typography>
            </Flex>
            <button
              type="button"
              css={({ palette, radius }) => ({
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                boxSizing: 'border-box',
                width: 60,
                height: 32,
                margin: 0,
                padding: '0 8px',
                borderRadius: radius.full,
                border: `1px solid ${palette.border}`,
                background: palette.border,
                font: 'inherit',
                lineHeight: 'normal',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: palette.textMuted },
                '& svg': {
                  position: 'relative',
                  zIndex: 1,
                  color: palette.textMuted,
                  transition: 'color 0.2s',
                },
                // Sun lit while in light mode, moon lit while in dark mode — both icons are always
                // visible at fixed positions; only their color and the thumb underneath change.
                "&[aria-pressed='false'] svg:first-of-type, &[aria-pressed='true'] svg:last-of-type":
                  { color: palette.text },
              })}
              onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={mode === 'dark'}
            >
              <span
                css={({ palette, radius }) => ({
                  position: 'absolute',
                  // `top: 50%` + `translateY(-50%)` centers it despite the border eating into the
                  // button's content box; a fixed `top: 3px` sat 2px above true center.
                  top: '50%',
                  left: 3,
                  width: 26,
                  height: 26,
                  borderRadius: radius.full,
                  background: palette.surfaceRaised,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                  transform: mode === 'dark' ? 'translate(28px, -50%)' : 'translateY(-50%)',
                  transition: 'transform 0.2s ease',
                })}
              />
              <Icon name="lu:sun" size={14} />
              <Icon name="lu:moon" size={14} />
            </button>
          </header>

          <ComponentDoc
            title="Grid"
            components={['Grid']}
            description="Lays tiles out in equal-width columns (`columns`, default 2). Cells share the width and never overflow it."
          >
            <Flex direction="column" gap={5}>
              <Grid columns={2}>
                <Tile label="Two" icon="lu:layout-grid" secondary="columns={2}" />
                <Tile label="Columns" icon="lu:layout-grid" secondary="equal width" />
              </Grid>
              <Grid columns={3}>
                <Tile label="Three" icon="lu:layout-grid" secondary="columns={3}" />
                <Tile label="Columns" icon="lu:layout-grid" secondary="equal width" />
                <Tile label="Wide" icon="lu:layout-grid" secondary="fits the row" />
              </Grid>
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Room Header"
            components={['RoomHeader']}
            description="The header that starts a room: a muted icon and title, a hairline and readouts on the right, placed above a Grid (or any tiles). It adds its own space above, so consecutive rooms read as groups."
          >
            <Flex direction="column" gap={4}>
              <RoomHeader title="Kitchen" icon="lu:utensils-crossed" />
              <RoomHeader
                title="Porch"
                icon="lu:house"
                readouts={
                  <>
                    <SensorReadout entity="ha:sensor.temperature" />
                    <SensorReadout entity="ha:sensor.humidity" />
                  </>
                }
              />
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Tile"
            components={['Tile']}
            description="The base card every entity tile is built from: icon, label, status line, optional fill bar (drag to change it), trailing controls, a hold-to-open drawer and pending / done / error feedback. Use it directly for something that isn't an entity."
          >
            <Grid>
              <Tile label="Plain" icon="lu:lamp" secondary="Off" />
              <Tile label="Active" icon="lu:lamp" active />
              <TileFillDemo />
              <Tile
                label="With controls"
                icon="lu:fan"
                trailing={
                  <Typography as="span" variant="secondary" color="textMuted">
                    trailing
                  </Typography>
                }
              />
              <Tile label="Pending" icon="lu:lamp" feedback="pending" />
              <Tile label="Error" icon="lu:lamp" feedback="error" />
              <Tile label="Unavailable" icon="lu:lamp" status="unavailable" />
              <Tile label="Not found" icon="lu:lamp" status="missing" />
            </Grid>
          </ComponentDoc>

          <ComponentDoc
            title="Icon"
            components={['Icon']}
            description="A plain prefixed string, no import: `lu:` is Lucide, `tb:` is Tabler outline. It takes the surrounding text color and scales with `size` (default 24px)."
          >
            <Flex direction="column" gap={4}>
              <Flex align="center" gap={4}>
                <Icon name="lu:lightbulb" />
                <Icon name="lu:thermometer" size={16} />
                <Icon name="lu:sofa" size={32} />
                <Icon name="tb:vacuum-cleaner" />
                <Icon name="tb:car-fan" size={16} />
              </Flex>
              <Flex align="center" gap={4} css={{ flexWrap: 'wrap' }}>
                <Typography as="span" variant="body" color="textMuted">
                  Find an icon:
                </Typography>
                {ICON_PACKS.map((pack) => (
                  <Typography key={pack.prefix} as="span" variant="body">
                    <a
                      css={({ palette }) => ({ color: palette.accent, textUnderlineOffset: 3 })}
                      href={pack.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Search {pack.name} icons (<span css={codeStyles}>{pack.prefix}:</span>)
                    </a>
                  </Typography>
                ))}
              </Flex>
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Energy Chart"
            components={['EnergyChart']}
            description="A power section for a drawer, which tiles pass through `energy`: a live power reading, usage tiles and a sparkline. Expanded in a drawer it becomes the full chart with a range switcher."
          >
            <EnergyChart
              power="ha:sensor.heater_power"
              energy="ha:sensor.heater_energy"
              usage={heaterUsage}
              seriesByRange={heaterSeries}
            />
          </ComponentDoc>

          <ComponentDoc
            title="History Section"
            components={['HistorySection']}
            description="Recent activity for a drawer, which tiles pass through `history`: who or what changed the entity, and when. An empty list renders nothing."
          >
            <HistorySection entries={lampHistory} />
          </ComponentDoc>

          <ComponentDoc
            title="Light Tile"
            components={['LightTile']}
            description="Tap to toggle, hold to open its detail drawer. Dimmable lights drag to set brightness; color-capable lights add a palette button that opens swatches in the card (white temperatures by default, overridable with `colors`), and the card's icon shows the light's current color. The drawer has the full temperature and hue bars."
          >
            <Grid>
              <LightTile entity="ha:light.plain_on" energy={lampEnergy} history={lampHistory} />
              <LightTile entity="ha:light.plain_off" history={stairsHistory} />
              <LightTile
                entity="ha:light.dimmable"
                icon="lu:sparkles"
                energy={ledEnergy}
                history={ledHistory}
              />
              <LightTile entity="ha:light.color" icon="lu:lamp-desk" history={nightLampHistory} />
              <LightTile entity="ha:light.cct" icon="lu:lamp-desk" />
              <LightTile entity="ha:light.unavailable" />
              <LightTile entity="ha:light.missing" />
            </Grid>
          </ComponentDoc>

          <ComponentDoc
            title="Climate Tile"
            components={['ClimateTile']}
            description="A heater/thermostat tile: a mode button that opens mode swatches in the card (like light colors), plus a target-temperature stepper. Hold for the drawer: modes, a target bar with fine +/- (hold to repeat), presets, energy and history."
          >
            <Grid columns={1}>
              <ClimateTile
                entity="ha:climate.heater"
                energy={heaterEnergy}
                history={heaterHistory}
              />
              <ClimateTile
                entity="ha:climate.off"
                energy={thermostatEnergy}
                history={heaterHistory}
              />
              <ClimateTile entity="ha:climate.unavailable" />
            </Grid>
          </ComponentDoc>

          <ComponentDoc
            title="Sensor Readout"
            components={['SensorReadout']}
            description="An inline value with icon and unit, defaulting its icon by device class. Readings outside a safe range get a warning (humidity defaults to 30–60 %; override with `safeRange`). Pass `history` to make it tappable: the drawer charts it with min/max for today, this week and this month, and a custom date and time range when expanded."
          >
            <Grid columns={3}>
              <SensorReadout entity="ha:sensor.temperature" history={temperatureHistory} />
              <SensorReadout entity="ha:sensor.humidity" history={humidityHistory} />
              <SensorReadout entity="ha:sensor.bedroom_humidity" history={bedroomHumidityHistory} />
              <SensorReadout entity="ha:sensor.office_humidity" history={officeHumidityHistory} />
              <SensorReadout entity="ha:sensor.unavailable" />
              <SensorReadout entity="ha:sensor.unknown" />
            </Grid>
          </ComponentDoc>

          <ComponentDoc
            title="Scene Button & Action Button"
            components={['SceneButton', 'ActionButton']}
            description="A scene is just an action entity. An action button triggers an action (or flips a switch) and shows pending / done / error feedback after a press; `onPress` runs your own logic instead."
          >
            <Grid columns={3}>
              <SceneButton entity="ha:scene.tv_time" />
              <ActionButton label="Shower" icon="tb:bath" entity="ha:script.shower" />
              <ActionButton
                label="Always Fails"
                onPress={() => Promise.reject(new Error('That went wrong'))}
              />
            </Grid>
          </ComponentDoc>

          <ComponentDoc
            title="Media Player Bar"
            components={['MediaPlayerBar']}
            description="Track info (with a small shuffle toggle by the title) and the time beside it, then volume, browse, previous, play/pause and next (the artwork opens the browser too), with a thin progress line along the bottom while something plays. The browse button opens the player's own library in the drawer; pass `browse` content to replace it, or `false` for no button. The volume button opens a volume slider in the bar (with a mute swatch, like the light colors and climate modes). Shows album art, or a note glyph when there is none."
          >
            <Flex direction="column" gap={3}>
              <MediaPlayerBar entity="ha:media_player.living_room" />
              <MediaPlayerBar entity="ha:media_player.off" />
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Media Player Column"
            components={['MediaPlayerColumn']}
            description="The player as an upright card for a narrow column beside a dashboard: the artwork in a ring that shows how far along playback is (drag around it to seek), title, transport, and a volume bar that is always visible. The browse button opens the library in the drawer."
          >
            <Flex width={320}>
              <MediaPlayerColumn entity="ha:media_player.living_room" />
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Media Player Full"
            components={['MediaPlayerFull']}
            description="The big player: the player centered, and its library below it, so songs are picked right there instead of in a drawer. The media cards' drawers show it too. A dashboard puts it in a page of its own, around it whatever it likes."
          >
            {/* No fixed height: it fills whatever it is given, so here it is as tall as what it shows,
                with no spare room under it. */}
            <Flex direction="column">
              <MediaPlayerFull
                entity="ha:media_player.living_room"
                wide
                browser={<MediaBrowser entity="ha:media_player.living_room" layout="theater" />}
              />
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Weather Forecast"
            components={['WeatherForecast']}
            description="A weather entity's forecast: the weather now, the next 24 hours as a chart (hover it for everything about an hour) and the days ahead. The top bar's weather chip shows it in a drawer; a dashboard can put it in a page of its own. Narrow, then with `expanded` (readings tiles, a card for each hour)."
          >
            <Flex direction="column" gap={6}>
              <Flex direction="column" width={380}>
                <WeatherForecast entity="ha:weather.home" expanded={false} />
              </Flex>
              <WeatherForecast entity="ha:weather.home" expanded />
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Media Browser"
            components={['MediaBrowser']}
            description="A player's own library in the app's style: tap a folder to open it, a track or station to play it, or the play button on an album, playlist or artist for all of it. The search box appears when the library can be searched. The `theater` layout (second demo) is one row of large cards that scrolls sideways, for a wide space; `list` is the compact default."
          >
            <Flex direction="column" gap={6}>
              <Flex direction="column" maxHeight={420} overflow="auto">
                <MediaBrowser entity="ha:media_player.living_room" />
              </Flex>
              <MediaBrowser entity="ha:media_player.living_room" layout="theater" />
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Navigation"
            components={['NavRail', 'NavDock', 'Page']}
            description="Routes within one dashboard. A dashboard includes one itself, usually in its layout route: NavRail is fixed to the left and NavDock floats at the bottom, and both reserve the space they take in the Page around them, which pads so content never sits under them."
          >
            <Flex direction="column" gap={5}>
              <SubPreview label="NavRail, in a Page" height={240}>
                <Page height="100%">
                  <NavRail base="/gallery" items={NAV_ITEMS} />
                  <Typography as="p" variant="body" color="textMuted">
                    Page content, padded clear of the rail.
                  </Typography>
                </Page>
              </SubPreview>
              <SubPreview label="NavDock" height={140}>
                <NavDock base="/gallery" items={NAV_ITEMS} />
              </SubPreview>
            </Flex>
          </ComponentDoc>

          <ComponentDoc
            title="Top Bar"
            components={['TopBar']}
            description="Page chrome above a dashboard's content: a title (a dropdown to switch dashboards, once there's more than one to switch to), scene shortcuts, weather (tap it for the forecast), presence, and a clock."
          >
            <TopBar
              title="Living Room"
              dashboards={[
                { id: 'living-room', title: 'Living Room', icon: 'lu:sofa' },
                { id: 'bedroom', title: 'Bedroom', icon: 'lu:bed' },
                { id: 'bathroom', title: 'Bathroom', icon: 'tb:bath' },
              ]}
              scenes={[{ entity: 'ha:scene.tv_time', icon: 'lu:tv' }]}
              weather="ha:weather.home"
              people={['ha:person.dan', 'ha:person.alex']}
            />
          </ComponentDoc>

          <ComponentDoc
            title="Presence Stack"
            components={['PresenceStack']}
            description="Overlapping avatar circles for a handful of person entities (the Top Bar's presence), each with a picture or a colored initial."
          >
            <PresenceStack entities={['ha:person.dan', 'ha:person.alex']} />
          </ComponentDoc>

          <ComponentDoc
            title="System Status"
            components={['SystemStatus']}
            description="The dot at the top bar's right edge. Green when the runtime and every integration are up, amber while something is connecting, red when something is down; click it for per-system detail. Shown here open, in each state."
          >
            <Flex gap={6} px={6} align="flex-start" justify="space-around" minHeight={32}>
              <SystemStatus
                defaultOpen
                link="open"
                statuses={{ ha: 'connected', ma: 'connected' }}
              />
              <SystemStatus
                defaultOpen
                link="open"
                statuses={{ ha: 'connected', ma: 'connecting' }}
              />
              <SystemStatus
                defaultOpen
                link="open"
                statuses={{ ha: 'error', ma: 'disconnected' }}
              />
            </Flex>
          </ComponentDoc>
          <ComponentDoc
            title="Hashsome Provider"
            description="The app provider: connects to the runtime, installs the theme, font and density globally, and renders the shared detail drawer. Everything on this page runs inside one — use the toggle above to flip its theme."
            components={['HashsomeProvider']}
          >
            <Typography as="span" variant="body" color="textMuted">
              {`theme="${mode}" · density="${density}"`}
            </Typography>
          </ComponentDoc>
        </div>
      </div>
    </HashsomeProvider>
  );
}
