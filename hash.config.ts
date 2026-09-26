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
      : [new MockIntegration({ entities: { 'light.lamp': { state: 'off' } } })],
});
