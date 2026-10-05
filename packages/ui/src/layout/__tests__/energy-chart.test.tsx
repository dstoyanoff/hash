// @vitest-environment jsdom
import { LocalClient, MockIntegration, mockSensor, type HistoryQuery } from '@hashsome/core';
import { act, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { HashsomeProvider } from '../../provider.tsx';
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

test('the usage tiles and the chart come from the backend history when none is passed', async () => {
  const asked: unknown[] = [];
  class WithHistory extends MockIntegration {
    history(entityId: string, query: HistoryQuery) {
      asked.push([entityId, query]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Promise.resolve(
        entityId === 'lamp_energy'
          ? { kind: 'total' as const, points: [{ timestamp: today.toISOString(), value: 0.25 }] }
          : {
              kind: 'measurement' as const,
              points: [
                { timestamp: today.toISOString(), value: 5 },
                { timestamp: new Date(today.getTime() + 3_600_000).toISOString(), value: 7 },
              ],
            },
      );
    }
  }

  const ha = new WithHistory({ entities });
  render(
    <HashsomeProvider client={new LocalClient([ha])}>
      <EnergyChart power="ha:lamp_power" energy="ha:lamp_energy" />
    </HashsomeProvider>,
  );

  expect((await screen.findAllByText('250 Wh')).length).toBeGreaterThan(0);
  expect(asked).toContainEqual(['lamp_power', { range: '1d' }]);
  expect(asked).toContainEqual(['lamp_energy', { range: '1m', bucket: '1d' }]);
});

test('a backend that keeps no history just shows the live reading', async () => {
  renderWithMock(<EnergyChart power="ha:lamp_power" energy="ha:lamp_energy" />, entities);
  await act(async () => {});
  expect(screen.getByText('9 W')).toBeTruthy();
  expect(screen.queryByText('Today')).toBeNull();
});
