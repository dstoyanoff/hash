import { expect, test, vi } from 'vitest';
import type { Entity } from '../model/index.ts';
import { LocalClient } from '../local-client.ts';
import { mockLibrary, mockLight, mockMediaPlayer, MockIntegration } from '../mock.ts';

const make = () => {
  const ha = new MockIntegration({ entities: { lamp: mockLight({ on: false }) } });
  return { ha, client: new LocalClient([ha]) };
};

test('exposes entities, changes and null for unknown entities/integrations', () => {
  const { ha, client } = make();
  client.connect();
  const listener = vi.fn<(e: Entity | null | undefined) => void>();
  client.subscribe('ha:lamp', listener);
  ha.update('lamp', { on: true });
  expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ on: true }));
  expect(client.getEntity('ha:nope')).toBeNull();
  expect(client.getEntity('zz:lamp')).toBeNull();
});

test('subscribing to an unknown entity reports null instead of throwing', () => {
  const { client } = make();
  const listener = vi.fn<(e: Entity | null | undefined) => void>();
  client.subscribe('ha:nope', listener);
  expect(listener).toHaveBeenCalledWith(null);
});

test('routes commands and reports link/integration status', async () => {
  const { ha, client } = make();
  const links: string[] = [];
  client.onLinkChange((l) => links.push(l));
  client.connect();
  expect(client.getIntegrationStatus('ha')).toBe('connected');
  await client.command('ha:lamp', 'toggle');
  expect(ha.getEntity('lamp')).toMatchObject({ on: true });
  await expect(client.command('zz:lamp', 'toggle')).rejects.toThrow(/Unknown/);
  await expect(client.callRaw('ha', {})).rejects.toThrow(/no raw requests/);
  client.close();
  expect(links).toEqual(['open', 'closed']);
});

test('browse goes to the integration that owns the player, and says so when it has no library', async () => {
  const withLibrary = new MockIntegration({
    entities: { room: mockMediaPlayer({ capabilities: { browse: true } }) },
    library: mockLibrary(),
  });

  const client = new LocalClient([withLibrary, new MockIntegration({ id: 'zz', entities: {} })]);
  const root = await client.browse('ha:room', {});
  expect(root.items.map((item) => item.title)).toContain('Playlists');
  await expect(client.browse('zz:room', {})).rejects.toThrow(/no library|Unknown/);
  await expect(client.browse('nope:room', {})).rejects.toThrow(/Unknown integration/);
});
