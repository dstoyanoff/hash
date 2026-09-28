import { HomeAssistantIntegration, MockIntegration } from '@hash/core';
import { defineConfig } from '@hash/runtime';

// Dogfood instance: serves the dashboards in `examples/`. Set HA_URL/HA_TOKEN to use a real
// Home Assistant, otherwise a mock backend is used.
const { HA_URL, HA_TOKEN } = process.env;

export default defineConfig({
  dashboardsDir: 'examples',
  integrations:
    HA_URL && HA_TOKEN
      ? [new HomeAssistantIntegration({ url: HA_URL, token: HA_TOKEN })]
      : [
          new MockIntegration({
            entities: {
              'light.lamp': {
                state: 'off',
                attributes: { supported_color_modes: ['brightness'], brightness: 128 },
              },
              'climate.heater': {
                state: 'heat',
                attributes: {
                  hvac_modes: ['off', 'heat'],
                  temperature: 17,
                  current_temperature: 16.4,
                },
              },
              'sensor.temperature': {
                state: '18.04',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },
            },
          }),
        ],
});
