// @vitest-environment jsdom
import { mockSensor } from '@hash/core';
import { act, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { EnergyChart } from '../energy-chart.tsx';

const entities = {
  lamp_power: mockSensor({ value: '9', unit: 'W' }),
  lamp_energy: mockSensor({ value: '1.64', unit: 'kWh' }),
};

test('the headline follows the live power sensor as it updates', () => {
  const { ha } = renderWithMock(<EnergyChart power="ha:lamp_power" />, entities);
  expect(screen.getByText('9 W')).toBeTruthy();
  act(() => ha.update('lamp_power', { value: '12', numeric: 12 }));
  expect(screen.getByText('12 W')).toBeTruthy();
});

test('an unavailable power sensor shows a dash, not a stale number', () => {
  renderWithMock(<EnergyChart power="ha:lamp_power" />, {
    lamp_power: mockSensor({ value: '9', availability: 'unavailable' }),
  });

  expect(screen.getByText('—')).toBeTruthy();
});

test('collapsed usage tiles are today / this week / this month, in Wh below 1 kWh', () => {
  renderWithMock(<EnergyChart usage={{ today: 0.18, week: 1.1, month: 14.7, last7d: 9 }} />);
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByText('This week')).toBeTruthy();
  expect(screen.getByText('This month')).toBeTruthy();
  expect(screen.queryByText('Last 7 days')).toBeNull();
  expect(screen.getByText('180 Wh')).toBeTruthy();
  expect(screen.getByText('1.10 kWh')).toBeTruthy();
  expect(screen.getByText('14.7 kWh')).toBeTruthy();
});

test('the lifetime counter is not shown collapsed', () => {
  renderWithMock(<EnergyChart energy="ha:lamp_energy" power="ha:lamp_power" />, entities);
  expect(screen.queryByText(/Lifetime/)).toBeNull();
});
