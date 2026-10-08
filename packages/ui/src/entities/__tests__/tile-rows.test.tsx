import { mockClimate, mockLight } from '@hashsome/core';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { ClimateTile } from '../climate-tile.tsx';
import { LightTile } from '../light-tile.tsx';

const devices = {
  dim: mockLight({ name: 'led', on: true, brightness: 0.6 }),
  plain: mockLight({ name: 'stairs lamp' }),
  color: mockLight({
    name: 'night lamp',
    on: true,
    brightness: 1,
    color: { mode: 'color', hue: 30, saturation: 100 },
    capabilities: { color: true },
  }),
  heater: mockClimate({
    name: 'heater',
    mode: 'heat',
    targetTemperature: 20,
    currentTemperature: 18,
  }),
};

const tile = (name: string) => document.querySelector(`[data-status]:has([aria-label="${name}"])`);

test('a light in two rows has its brightness on a track of its own, and the card is not the slider', async () => {
  const { ha } = renderWithMock(<LightTile entity="ha:dim" rows={2} />, devices);

  const track = screen.getByRole('slider', { name: 'Brightness' });
  expect(track.getAttribute('aria-valuenow')).toBe('60');
  expect(screen.getByRole('button', { name: 'led' }).textContent).toContain('60%');
  expect(tile('led')?.getAttribute('data-rows')).toBe('2');

  // The card is neutral, and dragging across it no longer dims: only the track does.
  expect(tile('led')?.getAttribute('data-fill')).toBe('false');
  track.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
  fireEvent.pointerDown(track, { clientX: 25, pointerId: 1 });
  fireEvent.pointerUp(track, { clientX: 25, pointerId: 1 });
  await vi.waitFor(() => expect(ha.getEntity('dim')).toMatchObject({ brightness: 0.25 }));
});

test('the second row of a light also holds its color button, and a tap on the top row toggles', () => {
  const { ha } = renderWithMock(<LightTile entity="ha:color" rows={2} />, devices);
  expect(screen.getByRole('button', { name: 'Color' })).toBeTruthy();
  expect(screen.getByRole('slider', { name: 'Brightness' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'night lamp' }));
  expect(ha.getEntity('color')).toMatchObject({ on: false });
});

test('a light that cannot dim or take a color has nothing for a second row, and stays one', () => {
  renderWithMock(<LightTile entity="ha:plain" rows={2} />, devices);
  expect(screen.queryByRole('slider', { name: 'Brightness' })).toBeNull();
  expect(tile('stairs lamp')?.getAttribute('data-rows')).toBeNull();
});

test('one row is what it was: the card dims by dragging and has no track', () => {
  renderWithMock(<LightTile entity="ha:dim" />, devices);
  expect(screen.queryByRole('slider', { name: 'Brightness' })).toBeNull();
  expect(tile('led')?.getAttribute('data-rows')).toBeNull();
});

test('a climate tile in two rows keeps its mode button and stepper, which still work', () => {
  const { ha } = renderWithMock(<ClimateTile entity="ha:heater" rows={2} />, devices);
  expect(tile('heater')?.getAttribute('data-rows')).toBe('2');
  fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
  expect(ha.getEntity('heater')).toMatchObject({ targetTemperature: 20.5 });
  expect(screen.getByRole('button', { name: 'Mode' })).toBeTruthy();
});

// `auto` asks the width the tile is given.

let width = 150;
let notify: (() => void) | undefined;
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notify = callback;
      }

      observe() {}
      disconnect() {}
    },
  );

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 0, width, height: 48 }) as DOMRect,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  notify = undefined;
});

test('auto is two rows below the width a kind needs, and follows the tile as it is resized', () => {
  width = 150;
  renderWithMock(<LightTile entity="ha:dim" rows="auto" />, devices);
  expect(tile('led')?.getAttribute('data-rows')).toBe('2');

  width = 320;
  act(() => notify?.());
  expect(tile('led')?.getAttribute('data-rows')).toBeNull();
  expect(screen.queryByRole('slider', { name: 'Brightness' })).toBeNull();
});

test('auto: a climate tile needs more width for one row than a light does', () => {
  width = 300;
  const { unmount } = renderWithMock(<ClimateTile entity="ha:heater" rows="auto" />, devices);
  expect(tile('heater')?.getAttribute('data-rows')).toBe('2');
  unmount();

  renderWithMock(<LightTile entity="ha:dim" rows="auto" />, devices);
  expect(tile('led')?.getAttribute('data-rows')).toBeNull();
});
