import { UnknownEntityError, type Entity } from '@hashsome/core';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, test, vi } from 'vitest';
import { HomeAssistantIntegration, type HaClient } from '../index.ts';

const entity = (id: string, state: string, attributes = {}): HassEntity =>
  ({
    entity_id: id,
    state,
    attributes,
    last_changed: 't',
    last_updated: 't',
    context: { id: 'c', parent_id: null, user_id: null },
  }) as HassEntity;

function fakeClient(initial: HassEntities = {}) {
  let push: (entities: HassEntities) => void = () => {};
  const handlers: Record<string, () => void> = {};
  const client: HaClient = {
    subscribeEntities: (cb) => {
      push = cb;
      cb(initial);
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
  const connected = async (initial: HassEntities = {}) => {
    const { client, push, handlers } = fakeClient(initial);
    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => client,
    });

    await ha.connect();
    return { ha, client, push, handlers };
  };

  test('maps entities to the generic model with refs and notifies only on change', async () => {
    const lamp = entity('light.lamp', 'on', {
      brightness: 51,
      supported_color_modes: ['brightness'],
    });

    const other = entity('light.other', 'off');
    const { ha, push } = await connected({ 'light.lamp': lamp, 'light.other': other });

    const lampListener = vi.fn<(entity: Entity | undefined) => void>();
    const otherListener = vi.fn<(entity: Entity | undefined) => void>();
    ha.subscribe('light.lamp', lampListener);
    ha.subscribe('light.other', otherListener);
    expect(lampListener).toHaveBeenLastCalledWith(
      expect.objectContaining({ ref: 'ha:light.lamp', kind: 'light', on: true, brightness: 0.2 }),
    );

    // Same object identity for `lamp`, new object for `other`.
    push({ 'light.lamp': lamp, 'light.other': entity('light.other', 'on') });
    expect(lampListener).toHaveBeenCalledTimes(1);
    expect(otherListener).toHaveBeenCalledTimes(2);

    // Removal
    push({ 'light.lamp': lamp });
    expect(otherListener).toHaveBeenLastCalledWith(undefined);
  });

  test('connect() resolves only after the first full set of entities has loaded', async () => {
    let deliver: (entities: HassEntities) => void = () => {};
    const client: HaClient = {
      ...fakeClient().client,
      subscribeEntities: (cb) => {
        deliver = cb;
        return () => {};
      },
    };

    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => client,
    });

    let done = false;
    const connecting = ha.connect().then(() => (done = true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(done).toBe(false);
    expect(ha.status).toBe('connecting');
    deliver({ 'sensor.t': entity('sensor.t', '1') });
    await connecting;
    expect(ha.status).toBe('connected');
    expect(ha.listEntities()).toHaveLength(1);
  });

  test('subscribing to an unknown id throws', async () => {
    const { ha } = await connected();
    expect(() => ha.subscribe('light.nope', () => {})).toThrow(UnknownEntityError);
  });

  test('tracks connection status and marks entities unavailable while disconnected', async () => {
    const { ha, handlers } = await connected({ 'sensor.t': entity('sensor.t', '1') });
    const statuses: string[] = [];
    ha.onStatusChange((s) => statuses.push(s));
    handlers.disconnected?.();
    expect(ha.getEntity('sensor.t')?.availability).toBe('unavailable');
    handlers.ready?.();
    handlers['reconnect-error']?.();
    ha.disconnect();
    expect(statuses).toEqual(['disconnected', 'connected', 'error', 'disconnected']);
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

  test('commands become service calls targeting the entity, and need a connection', async () => {
    const { client, ...rest } = fakeClient({ 'light.lamp': entity('light.lamp', 'off') });
    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: async () => client,
    });

    await expect(ha.command('light.lamp', 'toggle')).rejects.toThrow(/not connected/);
    await ha.connect();
    await ha.command('light.lamp', 'setBrightness', { brightness: 0.5 });
    expect(client.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      { brightness_pct: 50 },
      { entity_id: ['light.lamp'] },
    );

    await expect(ha.command('light.nope', 'toggle')).rejects.toThrow(UnknownEntityError);
    await expect(ha.command('light.lamp', 'setVolume', { volume: 1 })).rejects.toThrow(
      /no "setVolume"/,
    );

    void rest;
  });

  test('callRaw passes any service call through', async () => {
    const { ha, client } = await connected();
    await ha.callRaw({
      domain: 'script',
      service: 'turn_on',
      entityIds: ['script.x'],
      data: { a: 1 },
    });

    expect(client.callService).toHaveBeenCalledWith(
      'script',
      'turn_on',
      { a: 1 },
      { entity_id: ['script.x'] },
    );

    await expect(ha.callRaw({})).rejects.toThrow(/domain/);
  });
});

describe('HomeAssistantIntegration browse', () => {
  const setup = async (answer: unknown) => {
    const sent: Record<string, unknown>[] = [];
    const { client } = fakeClient({
      'media_player.room': entity('media_player.room', 'idle', { supported_features: 131072 }),
    });

    client.sendCommand = ((message: Record<string, unknown>) => {
      sent.push(message);
      return Promise.resolve(answer);
    }) as HaClient['sendCommand'];

    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: () => Promise.resolve(client),
    });

    await ha.connect();
    return { ha, sent };
  };

  const folder = (title: string, id: string, extra = {}) => ({
    title,
    media_class: 'directory',
    media_content_type: 'library',
    media_content_id: id,
    can_play: false,
    can_expand: true,
    ...extra,
  });

  test('the top level and an opened folder come from media_player/browse_media', async () => {
    const { ha, sent } = await setup({
      title: 'Media',
      children: [
        folder('Local media', 'media-source://media_source'),
        folder('Radio', 'radio', { media_class: 'channel', can_play: true, can_expand: false }),
      ],
    });

    const root = await ha.browse('media_player.room', {});
    expect(sent.at(-1)).toEqual({
      type: 'media_player/browse_media',
      entity_id: 'media_player.room',
    });

    expect(
      root.items.map((item) => [item.title, item.kind, item.playable, item.expandable]),
    ).toEqual([
      ['Local media', 'folder', false, true],
      ['Radio', 'radio', true, false],
    ]);

    await ha.browse('media_player.room', { path: root.items[0]!.id });
    expect(sent.at(-1)).toMatchObject({
      media_content_type: 'library',
      media_content_id: 'media-source://media_source',
    });
  });

  test('thumbnails Home Assistant serves itself go through the runtime, full ones stay', async () => {
    const { ha } = await setup({
      children: [
        folder('Public', 'a', { thumbnail: 'https://cdn.example/a.jpg' }),
        folder('Private', 'b', { thumbnail: '/api/media_player_proxy/x?token=secret' }),
      ],
    });

    const [open, closed] = (await ha.browse('media_player.room', {})).items;
    expect(open).toHaveProperty('artworkUrl', 'https://cdn.example/a.jpg');
    expect(closed).toHaveProperty(
      'artworkUrl',
      `/_hashsome/asset/ha?path=${encodeURIComponent('/api/media_player_proxy/x?token=secret')}`,
    );
  });

  test('search is refused, and an unknown player is an error', async () => {
    const { ha } = await setup({ children: [] });
    await expect(ha.browse('media_player.room', { search: 'x' })).rejects.toThrow(/searched/);
    await expect(ha.browse('media_player.nope', {})).rejects.toBeInstanceOf(UnknownEntityError);
  });

  describe('files', () => {
    const withFetch = async (response: Response) => {
      const spy = vi.fn<typeof fetch>(async () => response);
      vi.stubGlobal('fetch', spy);
      const ha = new HomeAssistantIntegration({
        url: 'https://ha.test:8123',
        token: 'secret',
        createClient: async () => fakeClient().client,
      });

      return { ha, spy };
    };

    test('artwork is addressed through the runtime and fetched with the token', async () => {
      const { ha, spy } = await withFetch(new Response('img'));
      await ha.connect();
      await ha.fetchAsset('/api/media_player_proxy/media_player.a?token=1');
      expect(String(spy.mock.calls[0]?.[0])).toBe(
        'https://ha.test:8123/api/media_player_proxy/media_player.a?token=1',
      );

      expect(spy.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: 'Bearer secret' });
      vi.unstubAllGlobals();
    });

    test('refuses an address that is not a path on Home Assistant', async () => {
      const { ha, spy } = await withFetch(new Response('img'));
      for (const path of ['https://evil.test/a', '//evil.test/a', 'api/x']) {
        await expect(ha.fetchAsset(path)).rejects.toThrow('Not a path on Home Assistant');
      }

      expect(spy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});

describe('HomeAssistantIntegration history', () => {
  const setup = async (meta: unknown, rows: unknown) => {
    const sent: Record<string, unknown>[] = [];
    const { client } = fakeClient({
      'sensor.power': entity('sensor.power', '12', {}),
    });

    client.sendCommand = ((message: Record<string, unknown>) => {
      sent.push(message);
      return Promise.resolve(message.type === 'recorder/get_statistics_metadata' ? meta : rows);
    }) as HaClient['sendCommand'];

    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: () => Promise.resolve(client),
    });

    await ha.connect();
    return { ha, sent };
  };

  test('a measurement is its mean per bucket, in the bucket the range suggests', async () => {
    const { ha, sent } = await setup(
      [
        {
          statistic_id: 'sensor.power',
          has_mean: true,
          has_sum: false,
          statistics_unit_of_measurement: 'W',
        },
      ],
      {
        'sensor.power': [
          { start: 1_000, mean: 3.5 },
          { start: 2_000, mean: null },
        ],
      },
    );

    const result = await ha.history('sensor.power', { range: '1d' });
    expect(result).toEqual({
      kind: 'measurement',
      unit: 'W',
      points: [{ timestamp: '1970-01-01T00:00:01.000Z', value: 3.5 }],
    });

    expect(sent.at(-1)).toMatchObject({
      type: 'recorder/statistics_during_period',
      statistic_ids: ['sensor.power'],
      period: '5minute',
      types: ['mean'],
    });
  });

  test('a running total is how much it grew per bucket, and the bucket can be chosen', async () => {
    const { ha, sent } = await setup(
      [
        {
          statistic_id: 'sensor.power',
          has_mean: false,
          has_sum: true,
          statistics_unit_of_measurement: 'kWh',
        },
      ],
      { 'sensor.power': [{ start: 86_400_000, change: 0.31 }] },
    );

    const result = await ha.history('sensor.power', { range: '1m', bucket: '1d' });
    expect(result).toMatchObject({ kind: 'total', unit: 'kWh', points: [{ value: 0.31 }] });
    expect(sent.at(-1)).toMatchObject({ period: 'day', types: ['change'] });
  });

  test('an entity without statistics has no points, and an unknown one is an error', async () => {
    const { ha, sent } = await setup([], {});
    expect(await ha.history('sensor.power', { range: '1h' })).toEqual({
      kind: 'measurement',
      points: [],
    });

    expect(sent).toHaveLength(1);
    await expect(ha.history('sensor.nope', { range: '1h' })).rejects.toBeInstanceOf(
      UnknownEntityError,
    );
  });
});

describe('HomeAssistantIntegration forecast', () => {
  const setup = async (response: unknown, attributes = { supported_features: 1 | 2 }) => {
    const sent: Record<string, unknown>[] = [];
    const { client } = fakeClient({
      'weather.home': entity('weather.home', 'sunny', { temperature_unit: '°C', ...attributes }),
      'light.lamp': entity('light.lamp', 'on', {}),
    });

    client.sendCommand = ((message: Record<string, unknown>) => {
      sent.push(message);
      return Promise.resolve({ context: {}, response });
    }) as HaClient['sendCommand'];

    const ha = new HomeAssistantIntegration({
      url: 'x',
      token: 'y',
      createClient: () => Promise.resolve(client),
    });

    await ha.connect();
    return { ha, sent };
  };

  test('asks weather.get_forecasts for the entity and the kind, and maps the answer', async () => {
    const { ha, sent } = await setup({
      'weather.home': {
        forecast: [{ datetime: '2026-10-06T00:00:00+00:00', condition: 'sunny', temperature: 17 }],
      },
    });

    expect(await ha.forecast('weather.home', { type: 'daily' })).toEqual({
      type: 'daily',
      unit: '°C',
      points: [{ timestamp: '2026-10-06T00:00:00.000Z', condition: 'sunny', temperature: 17 }],
    });

    expect(sent).toEqual([
      {
        type: 'call_service',
        domain: 'weather',
        service: 'get_forecasts',
        service_data: { type: 'daily' },
        target: { entity_id: 'weather.home' },
        return_response: true,
      },
    ]);
  });

  test('a kind the source does not give is empty, without asking', async () => {
    const { ha, sent } = await setup({});
    expect(await ha.forecast('weather.home', { type: 'twice_daily' })).toEqual({
      type: 'twice_daily',
      points: [],
    });

    expect(sent).toEqual([]);
  });

  test('an answer with no forecast is no points, and a non-weather or unknown entity is an error', async () => {
    const { ha } = await setup({});
    expect((await ha.forecast('weather.home', { type: 'hourly' })).points).toEqual([]);
    await expect(ha.forecast('light.lamp', { type: 'daily' })).rejects.toBeInstanceOf(
      UnknownEntityError,
    );

    await expect(ha.forecast('weather.nope', { type: 'daily' })).rejects.toBeInstanceOf(
      UnknownEntityError,
    );
  });
});
