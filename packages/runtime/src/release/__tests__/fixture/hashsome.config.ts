import { MockIntegration, mockLight } from '@hashsome/core';
import { defineConfig } from '../../../index.ts';

// A tiny project for the bundling test: one mock integration, and a port from the environment.
export default defineConfig({
  integrations: [new MockIntegration({ entities: { lamp: mockLight({ name: 'Lamp' }) } })],
});
