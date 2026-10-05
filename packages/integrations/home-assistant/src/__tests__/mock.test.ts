import { runIntegrationConformance } from '@hashsome/core/conformance';
import { describe, expect, test } from 'vitest';
import { createMock } from '../mock.ts';

runIntegrationConformance({
  name: 'Home Assistant',
  defaultId: 'ha',
  createMock,
  kinds: ['mediaPlayer', 'light', 'climate', 'sensor', 'switch', 'action', 'person'],
});

describe('Home Assistant mock', () => {
  test('is built from raw states by the real mapper', () => {
    const mock = createMock();
    expect(mock.getEntity('light.dimmable')).toMatchObject({ kind: 'light', brightness: 0.6 });
    expect(mock.getEntity('lock.front_door')).toMatchObject({ kind: 'switch', on: true });
  });

  test('extra entities are added, and replace a default with the same id', () => {
    const mock = createMock({
      entities: {
        'light.plain': {
          kind: 'light',
          name: 'Mine',
          availability: 'ready',
          on: false,
          capabilities: { brightness: false, colorTemperature: false, color: false },
        },
      },
    });

    expect(mock.getEntity('light.plain')).toMatchObject({ name: 'Mine', on: false });
  });
});
