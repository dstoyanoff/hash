import { describe, expect, test, vi } from 'vitest';
import type { Entity } from '../model/index.ts';
import { UnknownEntityError } from '../entity.ts';
import {
  mockAction,
  mockClimate,
  mockLibrary,
  mockLight,
  mockMediaPlayer,
  mockSensor,
  mockSwitch,
  MockIntegration,
} from '../mock.ts';

const make = () =>
  new MockIntegration({
    entities: {
      lamp: mockLight({ name: 'Lamp', brightness: 0.6, on: false }),
      heater: mockClimate({ mode: 'heat', targetTemperature: 17 }),
      player: mockMediaPlayer({ playback: 'playing', volume: 0.4 }),
      plug: mockSwitch(),
      scene: mockAction({ name: 'Movie' }),
      temp: mockSensor({ value: '18.04', unit: '°C', measurement: 'temperature' }),
    },
  });

describe('MockIntegration', () => {
  test('entities carry their ref, kind and defaults', () => {
    const ha = make();
    expect(ha.getEntity('lamp')).toMatchObject({
      ref: 'ha:lamp',
      kind: 'light',
      availability: 'ready',
      capabilities: { brightness: true, colorTemperature: false },
    });

    expect(ha.getEntity('temp')).toMatchObject({ numeric: 18.04 });
    expect(ha.listEntities()).toHaveLength(6);
  });

  test('subscribe emits the current entity, then changes', () => {
    const ha = make();
    const listener = vi.fn<(entity: Entity | undefined) => void>();
    ha.subscribe('lamp', listener);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ on: false }));
    ha.update('lamp', { on: true });
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ on: true }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('subscribing to an unknown id throws', () => {
    expect(() => make().subscribe('nope', () => {})).toThrow(UnknownEntityError);
  });

  test('commands update state and are recorded', async () => {
    const ha = make();
    await ha.command('lamp', 'setBrightness', { brightness: 0.25 });
    expect(ha.getEntity('lamp')).toMatchObject({ on: true, brightness: 0.25 });
    await ha.command('lamp', 'setBrightness', { brightness: 0 });
    expect(ha.getEntity('lamp')).toMatchObject({ on: false });
    await ha.command('lamp', 'setColorTemperature', { kelvin: 2700 });
    expect(ha.getEntity('lamp')).toMatchObject({
      on: true,
      color: { mode: 'temperature', kelvin: 2700 },
    });

    await ha.command('heater', 'setTargetTemperature', { temperature: 21 });
    expect(ha.getEntity('heater')).toMatchObject({ targetTemperature: 21 });
    await ha.command('player', 'setVolume', { volume: 2 });
    expect(ha.getEntity('player')).toMatchObject({ volume: 1 });
    await ha.command('plug', 'toggle');
    expect(ha.getEntity('plug')).toMatchObject({ on: true });
    await ha.command('scene', 'trigger');
    expect(ha.getEntity('scene')).toHaveProperty('lastTriggered');
    expect(ha.calls.map((c) => c.command)).toEqual([
      'setBrightness',
      'setBrightness',
      'setColorTemperature',
      'setTargetTemperature',
      'setVolume',
      'toggle',
      'trigger',
    ]);
  });

  test('commands reject for unknown entities, foreign commands and bad arguments', async () => {
    const ha = make();
    await expect(ha.command('nope', 'toggle')).rejects.toThrow(UnknownEntityError);
    await expect(ha.command('lamp', 'setVolume', { volume: 1 })).rejects.toThrow(/no "setVolume"/);
    await expect(ha.command('lamp', 'setBrightness', { brightness: 'x' })).rejects.toThrow(
      /numeric "brightness"/,
    );
  });

  test('status changes are reported, and leaving connected marks entities unavailable', async () => {
    const ha = make();
    const statuses: string[] = [];
    ha.onStatusChange((s) => statuses.push(s));
    await ha.connect();
    ha.disconnect();
    expect(statuses).toEqual(['connected', 'disconnected']);
    expect(ha.getEntity('lamp')?.availability).toBe('unavailable');
  });
});

describe('the mock library', () => {
  const player = () =>
    new MockIntegration({
      entities: { room: mockMediaPlayer({ capabilities: { browse: true, search: true } }) },
      library: mockLibrary(),
    });

  test('browse lists the top level, a folder, and what is searched for', async () => {
    const ha = player();
    expect((await ha.browse('room', {})).items.map((item) => item.title)).toEqual([
      'Recently played',
      'Playlists',
      'Albums',
      'Artists',
      'Radio',
    ]);

    expect((await ha.browse('room', { path: 'al-1989' })).items.map((item) => item.title)).toEqual([
      'Blank Space',
      'Style',
    ]);

    const found = await ha.browse('room', { search: 'dream' });
    expect(found.items.map((item) => item.title)).toEqual(['Dreams']);
    await expect(ha.browse('room', { path: 'missing' })).rejects.toThrow(/Nothing at/);
    await expect(ha.browse('nobody', {})).rejects.toBeInstanceOf(UnknownEntityError);
  });

  test('playMedia starts the item with its position at zero, and refuses what cannot be played', async () => {
    const ha = player();
    await ha.command('room', 'playMedia', { item: 't-dreams' });
    expect(ha.getEntity('room')).toMatchObject({
      playback: 'playing',
      media: { title: 'Dreams', artist: 'Fleetwood Mac' },
      position: 0,
      duration: 215,
    });

    await expect(ha.command('room', 'playMedia', { item: 'playlists' })).rejects.toThrow(
      /Cannot play/,
    );
  });

  test('seek moves the position and stamps when', async () => {
    const ha = player();
    await ha.command('room', 'seek', { position: 42 });
    expect(ha.getEntity('room')).toMatchObject({ position: 42 });
    expect(ha.getEntity('room')).toHaveProperty('positionUpdatedAt');
  });
});

test('setShuffle sets whether the player shuffles', async () => {
  const ha = new MockIntegration({
    entities: { room: mockMediaPlayer({ capabilities: { shuffle: true } }) },
  });

  await ha.command('room', 'setShuffle', { shuffle: true });
  expect(ha.getEntity('room')).toMatchObject({ shuffle: true });
  await ha.command('room', 'setShuffle', { shuffle: false });
  expect(ha.getEntity('room')).toMatchObject({ shuffle: false });
});
