import type { EntityState } from '@hash/core';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, test, vi } from 'vitest';
import { homeAssistantFromEnv, HomeAssistantIntegration, type HaClient } from './index.ts';

const entity = (id: string, state: string, attributes = {}): HassEntity =>
  ({
    entity_id: id,
    state,
    attributes,
    last_changed: 't',
    last_updated: 't',
    context: { id: 'c', parent_id: null, user_id: null },
  }) as HassEntity;

function fakeClient() {
  let push: (entities: HassEntities) => void = () => {};
  const handlers: Record<string, () => void> = {};
  const client: HaClient = {
    subscribeEntities: (cb) => {
      push = cb;
      return () => {};
    },
    callService: vi.fn<HaClient['callService']>().mockResolvedValue(undefined),
    sendCommand: (() => Promise.resolve([])) as HaClient['sendCommand'],
    on: (event, cb) => {
      handlers[event] = cb;
    },
    close: vi.fn<HaClient['close']>(),
  };
  return { client, push: (e: HassEntities) => push(e), handlers };
}

describe('HomeAssistantIntegration', () => {
  test('maps entities to states with refs and notifies only on change', async () => {
    const { client, push } = fakeClient();
    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => client,
    });
    await ha.connect();

    const lamp = entity('light.lamp', 'on', { brightness: 5 });
    const other = entity('light.other', 'off');
    push({ 'light.lamp': lamp, 'light.other': other });

    const lampListener = vi.fn<(state: EntityState | undefined) => void>();
    const otherListener = vi.fn<(state: EntityState | undefined) => void>();
    ha.subscribe('light.lamp', lampListener);
    ha.subscribe('light.other', otherListener);
    expect(lampListener).toHaveBeenLastCalledWith(
      expect.objectContaining({ ref: 'ha:light.lamp', state: 'on', attributes: { brightness: 5 } }),
    );

    // Same object identity for `lamp`, new object for `other`.
    push({ 'light.lamp': lamp, 'light.other': entity('light.other', 'on') });
    expect(lampListener).toHaveBeenCalledTimes(1);
    expect(otherListener).toHaveBeenCalledTimes(2);

    // Removal
    push({ 'light.lamp': lamp });
    expect(otherListener).toHaveBeenLastCalledWith(undefined);
  });

  test('tracks connection status', async () => {
    const { client, handlers } = fakeClient();
    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => client,
    });
    const statuses: string[] = [];
    ha.onStatusChange((s) => statuses.push(s));
    await ha.connect();
    handlers.disconnected?.();
    handlers.ready?.();
    handlers['reconnect-error']?.();
    ha.disconnect();
    expect(statuses).toEqual([
      'connecting',
      'connected',
      'disconnected',
      'connected',
      'error',
      'disconnected',
    ]);
  });

  test('connection failure sets error status and rethrows', async () => {
    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => {
        throw new Error('boom');
      },
    });
    await expect(ha.connect()).rejects.toThrow('boom');
    expect(ha.status).toBe('error');
  });

  test('callService forwards target and requires connection', async () => {
    const { client } = fakeClient();
    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => client,
    });
    await expect(ha.callService({ domain: 'light', service: 'toggle' })).rejects.toThrow(
      /not connected/,
    );
    await ha.connect();
    await ha.callService({
      domain: 'light',
      service: 'turn_on',
      entityIds: ['light.lamp'],
      data: { brightness: 1 },
    });
    expect(client.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      { brightness: 1 },
      { entity_id: ['light.lamp'] },
    );
  });
});

describe('homeAssistantFromEnv', () => {
  test('returns undefined unless both HA_URL and HA_TOKEN are set', () => {
    expect(homeAssistantFromEnv({})).toBeUndefined();
    expect(homeAssistantFromEnv({ HA_URL: 'http://ha' })).toBeUndefined();
    expect(homeAssistantFromEnv({ HA_TOKEN: 'x' })).toBeUndefined();
  });

  test('returns a HomeAssistantIntegration when both are set', () => {
    const ha = homeAssistantFromEnv({ HA_URL: 'http://ha', HA_TOKEN: 'x' });
    expect(ha).toBeInstanceOf(HomeAssistantIntegration);
    expect(ha?.id).toBe('ha');
  });
});
