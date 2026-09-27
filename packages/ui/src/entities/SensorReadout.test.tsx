import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../test-utils.tsx';
import { SensorReadout } from './SensorReadout.tsx';

test('formats numeric values with unit', () => {
  renderWithMock(<SensorReadout entity="ha:sensor.t" />, {
    'sensor.t': {
      state: '18.04',
      attributes: { unit_of_measurement: '°C', device_class: 'temperature' },
    },
  });
  expect(screen.getByText('18 °C')).toBeTruthy();
});

test('non-numeric values are shown as is', () => {
  renderWithMock(<SensorReadout entity="ha:sensor.t" />, { 'sensor.t': { state: 'clear' } });
  expect(screen.getByText('clear')).toBeTruthy();
});

test.each([
  ['unavailable', 'Unavailable'],
  ['unknown', 'Unknown'],
])('%s sensors show %s', (state, label) => {
  renderWithMock(<SensorReadout entity="ha:sensor.t" />, { 'sensor.t': { state } });
  expect(screen.getByText(label)).toBeTruthy();
});

test('missing sensors say so', () => {
  renderWithMock(<SensorReadout entity="ha:sensor.nope" />);
  expect(screen.getByText('Not found')).toBeTruthy();
});
