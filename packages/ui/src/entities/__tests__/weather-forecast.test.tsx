import { mockWeather } from '@hashsome/core';
import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { WeatherForecast } from '../weather-forecast.tsx';

test('expanded, on a page of its own: readings, a card per hour, the days', async () => {
  renderWithMock(<WeatherForecast entity="ha:sky" expanded />, {
    sky: mockWeather({ condition: 'sunny', temperature: 12, humidity: 70 }),
  });

  // The readings tiles and the 24 hours' cards only exist in the wide layout, with no drawer to ask.
  expect(await screen.findByText('Feels like')).toBeTruthy();
  expect(await screen.findByText(/^Next 24 hours/)).toBeTruthy();
  expect(await screen.findByText('10 days')).toBeTruthy();
  expect(screen.getByText('Pressure')).toBeTruthy();
  expect(screen.getAllByText(/^UV \d/).length).toBeGreaterThan(0);
});

test('not expanded, it is the narrow layout', async () => {
  renderWithMock(<WeatherForecast entity="ha:sky" expanded={false} />, {
    sky: mockWeather({ condition: 'sunny', temperature: 12 }),
  });

  expect(await screen.findByText(/^Next 24 hours/)).toBeTruthy();
  expect(screen.queryByText('Feels like')).toBeNull();
});

test('a weather source with no forecasts shows only the weather now', async () => {
  renderWithMock(<WeatherForecast entity="ha:sky" expanded />, {
    sky: mockWeather({ condition: 'rainy', temperature: 9, forecasts: [] }),
  });

  expect(await screen.findByText(/^Rain/)).toBeTruthy();
  expect(screen.queryByText(/^Next 24 hours/)).toBeNull();
  expect(screen.queryByText('10 days')).toBeNull();
});
