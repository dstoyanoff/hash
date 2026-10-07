import { LocalClient, MockIntegration, mockGeneric } from '@hashsome/core';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTheme } from '@emotion/react';
import { Box, Flex } from 'e-prim';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { HashsomeProvider, useThemeToggle, type ThemeMode } from '../provider.tsx';

afterEach(cleanup);

function Probe() {
  return <Box background="bg" data-testid="probe" />;
}

function renderWithTheme(theme?: ThemeMode) {
  const client = new LocalClient([new MockIntegration({})]);
  render(
    <HashsomeProvider client={client} {...(theme ? { theme } : {})}>
      <Probe />
    </HashsomeProvider>,
  );

  return getComputedStyle(screen.getByTestId('probe')).backgroundColor;
}

test('defaults to the dark theme when no theme prop is given', () => {
  expect(renderWithTheme()).toBe('rgb(11, 10, 13)'); // darkTheme.palette.bg #0B0A0D
});

test('theme="dark" resolves to the dark palette', () => {
  expect(renderWithTheme('dark')).toBe('rgb(11, 10, 13)');
});

test('theme="light" resolves to the light palette', () => {
  expect(renderWithTheme('light')).toBe('rgb(244, 241, 235)'); // lightTheme.palette.bg #F4F1EB
});

test('theme="system" degrades to light instead of throwing when matchMedia is unavailable', () => {
  // jsdom has no matchMedia at all; this just confirms the guard in provider.tsx doesn't crash —
  // a real browser would resolve this against the live OS preference instead.
  expect(renderWithTheme('system')).toBe('rgb(244, 241, 235)');
});

function ToggleProbe() {
  const { resolved, toggle } = useThemeToggle();
  return (
    <>
      <Box background="bg" data-testid="probe" />
      <button onClick={toggle}>{resolved}</button>
    </>
  );
}

test('useThemeToggle() flips the resolved theme, overriding the configured one', () => {
  const client = new LocalClient([new MockIntegration({})]);
  render(
    <HashsomeProvider client={client} theme="dark">
      <ToggleProbe />
    </HashsomeProvider>,
  );

  expect(getComputedStyle(screen.getByTestId('probe')).backgroundColor).toBe('rgb(11, 10, 13)');
  fireEvent.click(screen.getByRole('button', { name: 'dark' }));
  expect(getComputedStyle(screen.getByTestId('probe')).backgroundColor).toBe('rgb(244, 241, 235)');
  expect(screen.getByRole('button', { name: 'light' })).toBeTruthy();
});

function mount(props: { theme?: ThemeMode; density?: 'comfortable' | 'compact' } = {}) {
  const client = new LocalClient([new MockIntegration({})]);
  return render(
    <HashsomeProvider client={client} {...props}>
      <Probe />
    </HashsomeProvider>,
  );
}

test('the theme is installed globally on the page, not per dashboard', () => {
  mount({ theme: 'light' });
  expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(244, 241, 235)');
});

function DensityProbe() {
  const { density } = useTheme();
  return <output data-testid="density">{JSON.stringify(density)}</output>;
}

test('density is a HashsomeProvider setting: compact tightens the spacing tokens in the theme', () => {
  const read = (density?: 'comfortable' | 'compact') => {
    const client = new LocalClient([new MockIntegration({})]);
    render(
      <HashsomeProvider client={client} {...(density ? { density } : {})}>
        <DensityProbe />
      </HashsomeProvider>,
    );

    const tokens = JSON.parse(screen.getByTestId('density').textContent ?? '{}') as {
      space: number;
      tileHeight: number;
    };

    cleanup();
    return tokens;
  };

  expect(read().space).toBe(12);
  expect(read('compact')).toMatchObject({ space: 8, tileHeight: 52 });
});

function ThemeProbe() {
  const { palette, radius, typography, density } = useTheme();
  return (
    <output data-testid="theme">
      {JSON.stringify({
        accent: palette.accent,
        text: palette.text,
        card: radius.card,
        small: radius.small,
        label: typography.label,
        space: density.space,
        tileHeight: density.tileHeight,
      })}
    </output>
  );
}

const themeOf = (props: Partial<React.ComponentProps<typeof HashsomeProvider>>) => {
  const client = new LocalClient([new MockIntegration({})]);
  render(
    <HashsomeProvider client={client} {...props}>
      <ThemeProbe />
    </HashsomeProvider>,
  );

  const value = JSON.parse(screen.getByTestId('theme').textContent ?? '{}') as Record<
    string,
    unknown
  >;

  cleanup();
  return value;
};

test('overrides change only the tokens they name, and light and dark are separate', () => {
  const overrides = {
    light: { palette: { accent: '#2d6cdf' } },
    shared: { radius: { card: '10px' }, typography: { label: { fontSize: 15 } } },
  };

  const light = themeOf({ theme: 'light', overrides });
  expect(light).toMatchObject({ accent: '#2d6cdf', text: '#211E26', card: '10px', small: '9px' });
  expect(light.label).toMatchObject({ fontSize: 15, fontWeight: 500 });

  const dark = themeOf({ theme: 'dark', overrides });
  expect(dark).toMatchObject({ accent: '#FF7A45', card: '10px' });
});

test('without overrides the built-in theme is untouched', () => {
  expect(themeOf({ theme: 'dark' })).toMatchObject({ accent: '#FF7A45', card: '25px', space: 12 });
});

test('density overrides apply to their density only', () => {
  const overrides = { density: { comfortable: { space: 16 }, compact: { tileHeight: 40 } } };
  expect(themeOf({ overrides })).toMatchObject({ space: 16, tileHeight: 68 });
  expect(themeOf({ density: 'compact', overrides })).toMatchObject({ space: 8, tileHeight: 40 });
});

function SpacingProbe() {
  const { spacing } = useTheme();
  return (
    <>
      <output data-testid="space">{spacing(3)}</output>
      <Flex data-testid="gap" gap={3} />
      <Flex data-testid="pad" p={6} />
    </>
  );
}

const spacingOf = (props: Partial<React.ComponentProps<typeof HashsomeProvider>>) => {
  const client = new LocalClient([new MockIntegration({})]);
  render(
    <HashsomeProvider client={client} {...props}>
      <SpacingProbe />
    </HashsomeProvider>,
  );

  const result = {
    unit: screen.getByTestId('space').textContent,
    gap: getComputedStyle(screen.getByTestId('gap')).gap,
    pad: getComputedStyle(screen.getByTestId('pad')).padding,
  };

  cleanup();
  return result;
};

test('the spacing unit follows density, so gap={3} is one space and other spacing scales with it', () => {
  expect(spacingOf({})).toEqual({ unit: '12px', gap: '12px', pad: '24px' });
  expect(spacingOf({ density: 'compact' })).toEqual({ unit: '8px', gap: '8px', pad: '16px' });
});

test('changing the density’s space rescales all spacing', () => {
  const overrides = { density: { comfortable: { space: 18 } } };
  expect(spacingOf({ overrides })).toEqual({ unit: '18px', gap: '18px', pad: '36px' });
  // The other density is untouched.
  expect(spacingOf({ density: 'compact', overrides }).gap).toBe('8px');
});

// A theme that follows the time of day.

const DARK_BG = 'rgb(11, 10, 13)';
const LIGHT_BG = 'rgb(244, 241, 235)';
const bgOf = () => getComputedStyle(screen.getByTestId('probe')).backgroundColor;
const FAKE = ['Date', 'setTimeout', 'clearTimeout'] as const;

function mountScheduled(theme: ThemeMode, integration = new MockIntegration({})) {
  const client = new LocalClient([integration]);
  render(
    <HashsomeProvider client={client} theme={theme}>
      <Probe />
    </HashsomeProvider>,
  );

  return integration;
}

test('a clock schedule is dark inside its hours and light outside them', () => {
  vi.useFakeTimers({ now: new Date(2026, 9, 6, 22, 0), toFake: [...FAKE] });
  try {
    mountScheduled({ dark: { from: '19:00', to: '07:00' } });
    expect(bgOf()).toBe(DARK_BG);
    cleanup();

    vi.setSystemTime(new Date(2026, 9, 6, 12, 0));
    mountScheduled({ dark: { from: '19:00', to: '07:00' } });
    expect(bgOf()).toBe(LIGHT_BG);
  } finally {
    vi.useRealTimers();
  }
});

test('a clock schedule switches by itself when its time comes, without a reload', () => {
  vi.useFakeTimers({ now: new Date(2026, 9, 6, 18, 59, 30), toFake: [...FAKE] });
  try {
    mountScheduled({ dark: { from: '19:00', to: '07:00' } });
    expect(bgOf()).toBe(LIGHT_BG);

    act(() => void vi.advanceTimersByTime(31_000));
    expect(bgOf()).toBe(DARK_BG);
  } finally {
    vi.useRealTimers();
  }
});

test('a clock schedule with a time that is not HH:MM is refused', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(() => mountScheduled({ dark: { from: '7pm', to: '07:00' } })).toThrow('theme.dark.from');
  vi.restoreAllMocks();
});

beforeEach(() => localStorage.clear());

const sunWith = (value: string) =>
  new MockIntegration({ entities: { 'sun.sun': mockGeneric({ name: 'Sun', value }) } });

test('a sun schedule is dark while the sun entity says it is below the horizon', async () => {
  mountScheduled({ sun: 'ha:sun.sun' }, sunWith('below_horizon'));
  await waitFor(() => expect(bgOf()).toBe(DARK_BG));
});

test('a sun schedule is light while the sun is up, and follows the entity when it sets', async () => {
  const sun = sunWith('above_horizon');
  mountScheduled({ sun: 'ha:sun.sun' }, sun);
  await waitFor(() => expect(bgOf()).toBe(LIGHT_BG));

  act(() => sun.update('sun.sun', { value: 'below_horizon' }));
  await waitFor(() => expect(bgOf()).toBe(DARK_BG));
});

test('a sun schedule starts from what the sun last said, until the entity is known', () => {
  localStorage.setItem('hashsome:sun-down', '1');
  // No such entity: nothing to go by yet, so the remembered night is what shows.
  mountScheduled({ sun: 'ha:sun.sun' }, new MockIntegration({}));
  expect(bgOf()).toBe(DARK_BG);
});
