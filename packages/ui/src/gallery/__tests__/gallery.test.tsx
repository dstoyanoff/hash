// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import { Gallery } from '../gallery.tsx';

afterEach(cleanup);

test('gallery renders every component', () => {
  render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Gallery />
    </MemoryRouter>,
  );

  for (const name of [
    'Lamp',
    'Bathroom LED',
    'Night Lamp',
    'Living Room Heater',
    'TV Time',
    'Shower',
    'Blank Space',
  ]) {
    expect(screen.getAllByText(name).length).toBeGreaterThan(0);
  }

  // Uniform non-ready states across component types.
  expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(3);
  expect(screen.getAllByText('Not found').length).toBeGreaterThan(0);
  // NavRail and NavDock are demoed as separate contained previews here (not as this page's own
  // chrome), so "Home" resolves to one link per component.
  const homeLinks = screen.getAllByRole('link', { name: 'Home' });
  expect(homeLinks).toHaveLength(2);
  for (const link of homeLinks) {
    expect(link.getAttribute('aria-current')).toBe('page');
  }
});

test('gallery is documentation — a titled, described section per component', () => {
  render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Gallery />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: /component gallery/i, level: 1 })).toBeTruthy();
  for (const title of [
    'Light Tile',
    'Climate Tile',
    'Sensor Readout',
    'Media Player Bar',
    'Navigation',
    'Top Bar',
  ]) {
    expect(screen.getByRole('heading', { name: title, level: 2 })).toBeTruthy();
  }
});

test('each component section lists its props with their descriptions', () => {
  render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Gallery />
    </MemoryRouter>,
  );

  expect(screen.getByText(/Props · LightTile \(\d+\)/)).toBeTruthy();
  expect(
    screen.getByText(
      'A light, as a ref like `ha:light.kitchen_ceiling` or a handle (a custom source).',
    ),
  ).toBeTruthy();

  expect(screen.getByText(/Props · HashProvider/)).toBeTruthy();
});

test('the active media player demo shows artwork, the unavailable one shows the default glyph', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Gallery />
    </MemoryRouter>,
  );

  // The bar demos come first; the column and page below them hold players of their own.
  const bars = [...container.querySelectorAll('div[data-status]')]
    .filter((bar) => bar.querySelector('button[aria-label="Pause"], button[aria-label="Play"]'))
    .slice(0, 2);

  expect(bars).toHaveLength(2);
  expect(bars[0]!.querySelector('img')?.getAttribute('src')).toBe('/artwork.jpg');
  expect(bars[1]!.querySelector('img')).toBeNull();
  expect(bars[1]!.querySelector('svg')).not.toBeNull();
});
