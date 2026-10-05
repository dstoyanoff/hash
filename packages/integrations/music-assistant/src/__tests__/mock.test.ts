import { runIntegrationConformance } from '@hashsome/core/conformance';
import { expect, test } from 'vitest';
import { createMock } from '../mock.ts';

runIntegrationConformance({
  name: 'Music Assistant',
  defaultId: 'ma',
  createMock,
  kinds: ['mediaPlayer'],
});

test('players are built from raw Music Assistant players by the real mapper', () => {
  const mock = createMock();
  expect(mock.getEntity('living_room')).toMatchObject({
    kind: 'mediaPlayer',
    playback: 'playing',
    volume: 0.4,
  });

  expect(mock.getEntity('garage')).toMatchObject({ availability: 'unavailable', playback: 'off' });
});
