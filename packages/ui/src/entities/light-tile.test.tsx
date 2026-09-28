import { fireEvent, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../test-utils.tsx';
import { LightTile } from './light-tile.tsx';

const lights = {
  'light.plain': {
    state: 'off',
    attributes: { friendly_name: 'stairs lamp', supported_color_modes: ['onoff'] },
  },
  'light.dim': {
    state: 'on',
    attributes: { friendly_name: 'led', supported_color_modes: ['brightness'], brightness: 153 },
  },
  'light.colour': {
    state: 'on',
    attributes: { friendly_name: 'night lamp', supported_color_modes: ['hs'], brightness: 255 },
  },
  'light.gone': { state: 'unavailable', attributes: { friendly_name: 'porch' } },
};

test('shows name and state, and toggles on press', () => {
  const { ha } = renderWithMock(<LightTile entity="ha:light.plain" />, lights);
  expect(screen.getByRole('button', { name: 'stairs lamp' }).textContent).toContain('Off');
  fireEvent.click(screen.getByRole('button', { name: 'stairs lamp' }));
  expect(ha.getState('light.plain')?.state).toBe('on');
  expect(screen.getByRole('button', { name: 'stairs lamp' }).textContent).toContain('On');
});

test('name prop overrides the friendly name', () => {
  renderWithMock(<LightTile entity="ha:light.plain" name="hall" />, lights);
  expect(screen.getByRole('button', { name: 'hall' })).toBeTruthy();
});

test('dimmable lights show brightness and adjust with arrow keys', () => {
  const { ha } = renderWithMock(<LightTile entity="ha:light.dim" />, lights);
  const tile = screen.getByRole('button', { name: 'led' });
  expect(tile.textContent).toContain('60%');
  fireEvent.keyDown(tile, { key: 'ArrowRight' });
  expect(ha.calls.at(-1)).toMatchObject({
    domain: 'light',
    service: 'turn_on',
    data: { brightness_pct: 65 },
  });
});

test('dragging sets brightness from the pointer position and does not toggle', () => {
  const { ha } = renderWithMock(<LightTile entity="ha:light.dim" />, lights);
  const tile = screen.getByRole('button', { name: 'led' });
  tile.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
  fireEvent.pointerDown(tile, { clientX: 100, pointerId: 1 });
  fireEvent.pointerMove(tile, { clientX: 150, pointerId: 1 });
  fireEvent.pointerUp(tile, { clientX: 150, pointerId: 1 });
  fireEvent.click(tile);
  expect(ha.calls).toHaveLength(1);
  expect(ha.calls[0]).toMatchObject({ service: 'turn_on', data: { brightness_pct: 75 } });
});

test('dragging to the far left turns the light off', () => {
  const { ha } = renderWithMock(<LightTile entity="ha:light.dim" />, lights);
  const tile = screen.getByRole('button', { name: 'led' });
  tile.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
  fireEvent.pointerDown(tile, { clientX: 100, pointerId: 1 });
  fireEvent.pointerMove(tile, { clientX: 0, pointerId: 1 });
  fireEvent.pointerUp(tile, { clientX: 0, pointerId: 1 });
  expect(ha.calls.at(-1)).toMatchObject({ service: 'turn_off' });
});

test('colour lights offer a hue picker', () => {
  const { ha } = renderWithMock(<LightTile entity="ha:light.colour" />, lights);
  expect(screen.queryByLabelText('Hue')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Colour' }));
  fireEvent.change(screen.getByLabelText('Hue'), { target: { value: '120' } });
  expect(ha.calls.at(-1)).toMatchObject({ service: 'turn_on', data: { hs_color: [120, 100] } });
});

test('unavailable and missing lights are disabled and say why', () => {
  renderWithMock(
    <>
      <LightTile entity="ha:light.gone" />
      <LightTile entity="ha:light.nope" />
    </>,
    lights,
  );
  const gone = screen.getByRole('button', { name: 'porch' }) as HTMLButtonElement;
  expect(gone.disabled).toBe(true);
  expect(gone.textContent).toContain('Unavailable');
  const missing = screen.getByRole('button', { name: 'light.nope' }) as HTMLButtonElement;
  expect(missing.disabled).toBe(true);
  expect(missing.textContent).toContain('Not found');
});
