import { LocalClient, MockIntegration } from '@hashsome/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useTheme } from '@emotion/react';
import { Box, Flex } from 'e-prim';
import { afterEach, expect, test } from 'vitest';
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
  expect(dark).toMatchObject({ accent: '#B85C38', card: '10px' });
});

test('without overrides the built-in theme is untouched', () => {
  expect(themeOf({ theme: 'dark' })).toMatchObject({ accent: '#B85C38', card: '25px', space: 12 });
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
