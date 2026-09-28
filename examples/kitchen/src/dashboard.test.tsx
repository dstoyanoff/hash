import { LocalClient, MockIntegration } from '@hash/core';
import { HashProvider } from '@hash/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import Home from './pages/home.tsx';

afterEach(cleanup);

function renderDashboard() {
  const ha = new MockIntegration({
    entities: {
      'light.kitchen_ceiling': { state: 'off', attributes: { supported_color_modes: ['onoff'] } },
      'light.kitchen_led': {
        state: 'on',
        attributes: { supported_color_modes: ['brightness'], brightness: 180 },
      },
      'light.kitchen_island': {
        state: 'off',
        attributes: { supported_color_modes: ['hs'], brightness: 255, hs_color: [40, 60] },
      },
      'sensor.kitchen_temperature': {
        state: '21.3',
        attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
      },
      'sensor.kitchen_humidity': {
        state: '48',
        attributes: { device_class: 'humidity', unit_of_measurement: '%' },
      },
      'switch.kitchen_coffee_maker': { state: 'off' },
      'fan.kitchen_exhaust': { state: 'off' },
      'scene.cooking_time': { state: 'scening', attributes: { friendly_name: 'cooking time' } },
    },
  });
  const client = new LocalClient([ha]);
  return {
    ha,
    ...render(
      <HashProvider client={client}>
        <Home />
      </HashProvider>,
    ),
  };
}

test('kitchen page renders the room and its tiles', () => {
  renderDashboard();
  expect(screen.getByText('kitchen')).toBeTruthy();
  expect(screen.getByText('appliances')).toBeTruthy();
  for (const name of ['ceiling', 'under-cabinet', 'island pendant']) {
    expect(screen.getByRole('button', { name })).toBeTruthy();
  }
});

test('toggling the ceiling light round-trips through the mock', () => {
  const { ha } = renderDashboard();
  const ceiling = screen.getByRole('button', { name: 'ceiling' });
  expect(ceiling.textContent).toContain('Off');
  fireEvent.click(ceiling);
  expect(ha.getState('light.kitchen_ceiling')?.state).toBe('on');
  expect(ceiling.textContent).toContain('On');
});

test('appliance actions call the right service', () => {
  const { ha } = renderDashboard();
  fireEvent.click(screen.getByRole('button', { name: 'coffee maker' }));
  expect(ha.calls.at(-1)).toMatchObject({
    domain: 'switch',
    service: 'turn_on',
    entityIds: ['switch.kitchen_coffee_maker'],
  });
  fireEvent.click(screen.getByRole('button', { name: 'cooking time' }));
  expect(ha.calls.at(-1)).toMatchObject({ domain: 'scene', service: 'turn_on' });
});
