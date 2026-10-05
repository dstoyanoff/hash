import {
  mockAction,
  mockClimate,
  mockLight,
  mockMediaPlayer,
  mockSwitch,
  type Entity,
} from '@hash/core';
import { describe, expect, test } from 'vitest';
import { toServiceRequest } from '../commands.ts';

const entity = (input: ReturnType<typeof mockLight>) => ({ ...input, ref: 'ha:x' }) as Entity;
const req = (
  id: string,
  e: ReturnType<typeof mockLight>,
  name: string,
  args?: Record<string, unknown>,
) => toServiceRequest(id, entity(e), name, args);

describe('toServiceRequest, media', () => {
  const player = mockMediaPlayer();

  test('seek is clamped at zero and sent in seconds', () => {
    expect(req('media_player.a', player, 'seek', { position: 90 })).toEqual({
      domain: 'media_player',
      service: 'media_seek',
      data: { seek_position: 90 },
    });

    expect(req('media_player.a', player, 'seek', { position: -5 })).toMatchObject({
      data: { seek_position: 0 },
    });
  });

  test('setShuffle turns shuffle on or off', () => {
    expect(req('media_player.a', player, 'setShuffle', { shuffle: true })).toEqual({
      domain: 'media_player',
      service: 'shuffle_set',
      data: { shuffle: true },
    });

    expect(() => req('media_player.a', player, 'setShuffle', { shuffle: 1 })).toThrow(/boolean/);
  });

  test('playMedia decodes the item id and passes the mode as the enqueue option', () => {
    const item = `${encodeURIComponent('music')}|${encodeURIComponent('library://album/1')}`;
    expect(req('media_player.a', player, 'playMedia', { item })).toEqual({
      domain: 'media_player',
      service: 'play_media',
      data: { media_content_type: 'music', media_content_id: 'library://album/1' },
    });

    expect(req('media_player.a', player, 'playMedia', { item, mode: 'next' })).toMatchObject({
      data: { enqueue: 'next' },
    });

    expect(() => req('media_player.a', player, 'playMedia', { item: 'garbage' })).toThrow(
      /not a media item/,
    );

    expect(() => req('media_player.a', player, 'playMedia', { item, mode: 'loud' })).toThrow(
      /mode/,
    );

    expect(() => req('media_player.a', player, 'playMedia', {})).toThrow(/media item id/);
  });
});

describe('toServiceRequest', () => {
  test('light', () => {
    const light = mockLight({ on: true });
    expect(req('light.a', light, 'turnOn')).toEqual({ domain: 'light', service: 'turn_on' });
    expect(req('light.a', light, 'setBrightness', { brightness: 0.3 })).toEqual({
      domain: 'light',
      service: 'turn_on',
      data: { brightness_pct: 30 },
    });

    expect(req('light.a', light, 'setBrightness', { brightness: 0 })).toEqual({
      domain: 'light',
      service: 'turn_off',
    });

    expect(req('light.a', light, 'setColorTemperature', { kelvin: 2700 })).toMatchObject({
      data: { color_temp_kelvin: 2700 },
    });

    expect(req('light.a', light, 'setColor', { hue: 10, saturation: 90 })).toMatchObject({
      data: { hs_color: [10, 90] },
    });
  });

  test('climate uses Home Assistant mode names', () => {
    const climate = mockClimate({ mode: 'heat' });
    expect(req('climate.a', climate, 'setMode', { mode: 'heatCool' })).toEqual({
      domain: 'climate',
      service: 'set_hvac_mode',
      data: { hvac_mode: 'heat_cool' },
    });

    expect(req('climate.a', climate, 'setTargetTemperature', { temperature: 21.5 })).toMatchObject({
      service: 'set_temperature',
      data: { temperature: 21.5 },
    });

    expect(req('climate.a', climate, 'setPreset', { preset: 'away' })).toMatchObject({
      service: 'set_preset_mode',
      data: { preset_mode: 'away' },
    });
  });

  test('media player converts and validates', () => {
    const player = mockMediaPlayer({ playback: 'playing' });
    expect(req('media_player.a', player, 'next')).toEqual({
      domain: 'media_player',
      service: 'media_next_track',
    });

    expect(req('media_player.a', player, 'setVolume', { volume: 2 })).toMatchObject({
      data: { volume_level: 1 },
    });

    expect(req('media_player.a', player, 'setMuted', { muted: true })).toMatchObject({
      service: 'volume_mute',
      data: { is_volume_muted: true },
    });
  });

  test('switch domains follow the entity id; a lock toggles by its state', () => {
    expect(req('fan.a', mockSwitch({ on: false }), 'turnOn')).toEqual({
      domain: 'fan',
      service: 'turn_on',
    });

    expect(req('lock.a', mockSwitch({ on: true }), 'toggle')).toEqual({
      domain: 'lock',
      service: 'unlock',
    });

    expect(req('lock.a', mockSwitch({ on: false }), 'toggle')).toEqual({
      domain: 'lock',
      service: 'lock',
    });
  });

  test('actions pick the service for their domain', () => {
    const action = mockAction();
    expect(req('scene.a', action, 'trigger')).toEqual({ domain: 'scene', service: 'turn_on' });
    expect(req('button.a', action, 'trigger')).toEqual({ domain: 'button', service: 'press' });
    expect(req('vacuum.a', action, 'trigger')).toEqual({ domain: 'vacuum', service: 'start' });
    expect(req('automation.a', action, 'trigger')).toEqual({
      domain: 'automation',
      service: 'trigger',
    });
  });

  test('bad arguments and foreign commands throw', () => {
    const light = mockLight();
    expect(() => req('light.a', light, 'setBrightness', { brightness: 'x' })).toThrow(
      /must be a number/,
    );

    expect(() => req('light.a', light, 'next')).toThrow(/no "next" command/);
    expect(() => req('climate.a', mockClimate(), 'setMode', { mode: 'nope' })).toThrow(
      /not a climate mode/,
    );
  });
});
