import { LocalClient, mockLight, MockIntegration } from '@hash/core';
import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useConnectionStatus, useEntity } from '../hooks.ts';
import { HashProvider } from '../provider.tsx';

function Probe() {
  const entity = useEntity('ha:lamp');
  useConnectionStatus();
  return <output>{entity?.name ?? 'none'}</output>;
}

test('a mounted hook subscribes once and stays subscribed across re-renders and updates', () => {
  const ha = new MockIntegration({ entities: { lamp: mockLight({ name: 'Lamp' }) } });
  const client = new LocalClient([ha]);
  const subscribe = vi.spyOn(client, 'subscribe');
  const onLink = vi.spyOn(client, 'onLinkChange');
  render(
    <HashProvider client={client}>
      <Probe />
    </HashProvider>,
  );

  expect(screen.getByText('Lamp')).toBeTruthy();

  // Each update re-renders the probe; none of them may tear the subscription down and rebuild it,
  // which against a remote runtime sends an unsubscribe + subscribe per render and never settles.
  for (let i = 0; i < 3; i++) {
    act(() => ha.update('lamp', { name: `Lamp ${i}` }));
  }

  expect(screen.getByText('Lamp 2')).toBeTruthy();
  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(onLink).toHaveBeenCalledTimes(1);
});
