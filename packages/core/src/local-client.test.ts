import { expect, test, vi } from 'vitest';
import type { EntityState } from './entity.ts';
import { LocalClient } from './local-client.ts';
import { MockIntegration } from './mock.ts';

const make = () => {
  const ha = new MockIntegration({ entities: { 'light.lamp': { state: 'off' } } });
  return { ha, client: new LocalClient([ha]) };
};

test('exposes states, changes and null for unknown entities/integrations', () => {
  const { ha, client } = make();
  client.connect();
  const listener = vi.fn<(s: EntityState | null | undefined) => void>();
  client.subscribe('ha:light.lamp', listener);
  ha.update('light.lamp', { state: 'on' });
  expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'on' }));
  expect(client.getState('ha:light.nope')).toBeNull();
  expect(client.getState('zz:light.lamp')).toBeNull();
});

test('routes service calls and reports link/integration status', async () => {
  const { ha, client } = make();
  const links: string[] = [];
  client.onLinkChange((l) => links.push(l));
  client.connect();
  expect(client.getIntegrationStatus('ha')).toBe('connected');
  await client.callService('ha', { domain: 'light', service: 'toggle', entityIds: ['light.lamp'] });
  expect(ha.getState('light.lamp')?.state).toBe('on');
  await expect(client.callService('zz', { domain: 'a', service: 'b' })).rejects.toThrow(/Unknown/);
  client.close();
  expect(links).toEqual(['open', 'closed']);
});
