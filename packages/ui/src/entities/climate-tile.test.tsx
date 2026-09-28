import { fireEvent, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../test-utils.tsx';
import { ClimateTile } from './climate-tile.tsx';

const climate = (state = 'heat', temperature = 17) => ({
  'climate.heater': {
    state,
    attributes: {
      friendly_name: 'heater',
      hvac_modes: ['off', 'heat'],
      temperature,
      current_temperature: 16.4,
      target_temp_step: 0.5,
      min_temp: 5,
      max_temp: 30,
    },
  },
});

test('shows current and target temperature', () => {
  renderWithMock(<ClimateTile entity="ha:climate.heater" />, climate());
  expect(screen.getByRole('button', { name: 'heater' }).textContent).toContain('16.4 °C');
  expect(screen.getByText('17 °C')).toBeTruthy();
});

test('stepper changes the target by the entity step', () => {
  const { ha } = renderWithMock(<ClimateTile entity="ha:climate.heater" />, climate());
  fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
  expect(ha.getState('climate.heater')?.attributes.temperature).toBe(17.5);
  fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
  fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
  expect(ha.getState('climate.heater')?.attributes.temperature).toBe(16.5);
});

test('stepper stops at the entity limits', () => {
  renderWithMock(<ClimateTile entity="ha:climate.heater" />, climate('heat', 30));
  expect((screen.getByRole('button', { name: 'Increase' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});

test('mode button switches between off and heat', () => {
  const { ha } = renderWithMock(<ClimateTile entity="ha:climate.heater" />, climate('heat'));
  fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
  expect(ha.getState('climate.heater')?.state).toBe('off');
  fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
  expect(ha.getState('climate.heater')?.state).toBe('heat');
});

test('unavailable climate shows no controls', () => {
  renderWithMock(<ClimateTile entity="ha:climate.heater" />, {
    'climate.heater': { state: 'unavailable', attributes: { friendly_name: 'heater' } },
  });
  expect(screen.queryByRole('button', { name: 'Increase' })).toBeNull();
  expect(screen.getByRole('button', { name: 'heater' }).textContent).toContain('Unavailable');
});
