import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, test } from 'vitest';
import { mapEntity } from '../mappers/index.ts';

const hass = (id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({
    entity_id: id,
    state,
    attributes,
    last_changed: 'c',
    last_updated: 'u',
    context: { id: 'x', parent_id: null, user_id: null },
  }) as HassEntity;

const map = (e: HassEntity) => mapEntity(e, { temperatureUnit: '°C' });

describe('light', () => {
  test('brightness is 0..1 and capabilities come from the color modes', () => {
    const light = map(
      hass('light.a', 'on', {
        friendly_name: 'Lamp',
        supported_color_modes: ['color_temp', 'hs'],
        color_mode: 'color_temp',
        color_temp_kelvin: 2700,
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 6500,
        brightness: 255,
      }),
    );

    expect(light).toMatchObject({
      kind: 'light',
      name: 'Lamp',
      availability: 'ready',
      on: true,
      brightness: 1,
      color: { mode: 'temperature', kelvin: 2700 },
      capabilities: {
        brightness: true,
        colorTemperature: true,
        color: true,
        kelvinRange: { min: 2000, max: 6500 },
      },
      lastChanged: 'c',
    });
  });

  test('the active color_mode decides which color is live, and on/off-only lights are not dimmable', () => {
    const color = map(
      hass('light.b', 'on', {
        supported_color_modes: ['hs'],
        color_mode: 'hs',
        hs_color: [120, 80],
        rgb_color: [10, 200, 30],
        color_temp_kelvin: 2700,
      }),
    );

    expect(color).toMatchObject({
      color: { mode: 'color', hue: 120, saturation: 80, rgb: [10, 200, 30] },
    });

    const plain = map(hass('light.c', 'off', { supported_color_modes: ['onoff'] }));
    expect(plain).toMatchObject({ on: false, capabilities: { brightness: false, color: false } });
    expect(plain).not.toHaveProperty('brightness');
  });
});

describe('climate', () => {
  test('modes use the model names; unknown ones are dropped', () => {
    const climate = map(
      hass('climate.a', 'heat_cool', {
        hvac_modes: ['off', 'heat_cool', 'weird'],
        hvac_action: 'heating',
        temperature: 21,
        current_temperature: 19.5,
        current_humidity: 40,
        target_temp_step: 1,
        min_temp: 7,
        max_temp: 28,
        preset_modes: ['home', 'away'],
        preset_mode: 'home',
      }),
    );

    expect(climate).toMatchObject({
      kind: 'climate',
      mode: 'heatCool',
      action: 'heating',
      targetTemperature: 21,
      currentTemperature: 19.5,
      humidity: 40,
      unit: '°C',
      preset: 'home',
      capabilities: {
        modes: ['off', 'heatCool'],
        presets: ['home', 'away'],
        targetTemperature: true,
        step: 1,
        range: { min: 7, max: 28 },
      },
    });
  });

  test('the configured temperature unit is used', () => {
    expect(mapEntity(hass('climate.a', 'off'), { temperatureUnit: '°F' })).toMatchObject({
      unit: '°F',
    });
  });
});

describe('media player', () => {
  test('maps state, media, volume and the feature bitmask', () => {
    const player = map(
      hass('media_player.a', 'playing', {
        media_title: 'Blank Space',
        media_artist: 'More More',
        entity_picture_local: '/local.jpg',
        entity_picture: '/remote.jpg',
        volume_level: 0.4,
        is_volume_muted: false,
        supported_features: 4 | 8 | 32,
      }),
    );

    expect(player).toMatchObject({
      kind: 'mediaPlayer',
      playback: 'playing',
      volume: 0.4,
      muted: false,
      media: { title: 'Blank Space', artist: 'More More', artworkUrl: '/local.jpg' },
      capabilities: { volume: true, mute: true, next: true, previous: false, browse: false },
    });
  });

  test('standby is idle; without a feature mask transport is assumed', () => {
    expect(map(hass('media_player.a', 'standby'))).toMatchObject({
      playback: 'idle',
      capabilities: { next: true, previous: true, volume: false },
    });
  });
});

describe('other kinds', () => {
  test('sensor keeps text and the numeric reading', () => {
    expect(
      map(hass('sensor.t', '18.04', { unit_of_measurement: '°C', device_class: 'temperature' })),
    ).toMatchObject({
      kind: 'sensor',
      value: '18.04',
      numeric: 18.04,
      unit: '°C',
      measurement: 'temperature',
    });

    const text = map(hass('sensor.w', 'clear'));
    expect(text).toMatchObject({ value: 'clear' });
    expect(text).not.toHaveProperty('numeric');
  });

  test('unavailable and unknown states become availability, not values to interpret', () => {
    expect(map(hass('sensor.t', 'unavailable'))).toMatchObject({ availability: 'unavailable' });
    expect(map(hass('light.a', 'unknown'))).toMatchObject({ availability: 'unknown' });
  });

  test('switch-like domains are switches; a lock is on while locked', () => {
    expect(map(hass('switch.a', 'on'))).toMatchObject({ kind: 'switch', on: true });
    expect(map(hass('fan.a', 'off'))).toMatchObject({ kind: 'switch', on: false });
    expect(map(hass('lock.a', 'locked'))).toMatchObject({ kind: 'switch', on: true });
    expect(map(hass('lock.a', 'unlocked'))).toMatchObject({ kind: 'switch', on: false });
  });

  test('scenes, scripts, buttons and vacuums are actions', () => {
    for (const id of [
      'scene.a',
      'script.a',
      'button.a',
      'input_button.a',
      'automation.a',
      'vacuum.a',
    ]) {
      expect(map(hass(id, 'unknown'))).toMatchObject({ kind: 'action' });
    }
  });

  test('person', () => {
    expect(map(hass('person.dan', 'home', { entity_picture: '/p.jpg' }))).toMatchObject({
      kind: 'person',
      home: true,
      location: 'home',
      pictureUrl: '/p.jpg',
    });

    expect(map(hass('person.alex', 'not_home'))).toMatchObject({ home: false });
  });

  test('anything else is generic, and the raw payload is kept', () => {
    const cover = map(hass('cover.garage', 'open', { friendly_name: 'Garage' }));
    expect(cover).toMatchObject({
      kind: 'generic',
      value: 'open',
      raw: { state: 'open', attributes: { friendly_name: 'Garage' } },
    });
  });
});

describe('media player progress and library', () => {
  const player = (attributes: Record<string, unknown>) =>
    map(hass('media_player.room', 'playing', { friendly_name: 'Room', ...attributes }));

  test('position, duration and when the position was true come from Home Assistant', () => {
    expect(
      player({
        media_position: 64,
        media_duration: 231,
        media_position_updated_at: '2026-01-01T00:00:00.000Z',
      }),
    ).toMatchObject({ position: 64, duration: 231, positionUpdatedAt: '2026-01-01T00:00:00.000Z' });

    expect(player({ media_duration: 231 })).not.toHaveProperty('position');
  });

  test('seek and browse follow the feature flags, and search is never offered', () => {
    expect(player({ supported_features: 2 | 131072 })).toMatchObject({
      capabilities: { seek: true, browse: true, search: false },
    });

    expect(player({ supported_features: 4 })).toMatchObject({
      capabilities: { seek: false, browse: false, search: false },
    });
  });
});

describe('media player shuffle', () => {
  const player = (attributes: Record<string, unknown>) =>
    map(hass('media_player.room', 'playing', { friendly_name: 'Room', ...attributes }));

  test('shuffle comes from the attribute, and the feature flag says whether it can be set', () => {
    expect(player({ shuffle: true, supported_features: 32768 })).toMatchObject({
      shuffle: true,
      capabilities: { shuffle: true },
    });

    expect(player({ shuffle: false, supported_features: 4 })).toMatchObject({
      shuffle: false,
      capabilities: { shuffle: false },
    });

    expect(player({})).not.toHaveProperty('shuffle');
  });
});

describe('files Home Assistant serves itself', () => {
  const viaAssets = (path: string) => `/assets?path=${path}`;
  const mapAssets = (e: HassEntity) => mapEntity(e, { temperatureUnit: '°C', assetUrl: viaAssets });

  test('relative artwork and pictures go through the asset route, full addresses stay', () => {
    expect(
      mapAssets(hass('media_player.a', 'playing', { entity_picture: '/api/media_player_proxy/x' })),
    ).toMatchObject({ media: { artworkUrl: '/assets?path=/api/media_player_proxy/x' } });

    expect(
      mapAssets(hass('media_player.a', 'playing', { entity_picture: 'https://cdn.test/a.jpg' })),
    ).toMatchObject({ media: { artworkUrl: 'https://cdn.test/a.jpg' } });

    expect(
      mapAssets(hass('person.a', 'home', { entity_picture: '/api/image/serve/1/512x512' })),
    ).toMatchObject({ pictureUrl: '/assets?path=/api/image/serve/1/512x512' });
  });

  test('a protocol-relative address is not treated as a path on Home Assistant', () => {
    expect(
      mapAssets(hass('person.a', 'home', { entity_picture: '//evil.test/a.png' })),
    ).toMatchObject({ pictureUrl: '//evil.test/a.png' });
  });
});

describe('weather', () => {
  test('the state is the condition and the attributes are the readings', () => {
    expect(
      map(
        hass('weather.home', 'partlycloudy', {
          friendly_name: 'Forecast home',
          temperature: 20.5,
          temperature_unit: '°C',
          humidity: 29,
        }),
      ),
    ).toMatchObject({
      kind: 'weather',
      name: 'Forecast home',
      availability: 'ready',
      condition: 'partlycloudy',
      temperature: 20.5,
      unit: '°C',
      humidity: 29,
    });
  });

  test('a condition it does not know is unknown, and an unavailable entity says so', () => {
    expect(map(hass('weather.home', 'volcanic-ash'))).toMatchObject({ condition: 'unknown' });
    expect(map(hass('weather.home', 'unavailable'))).toMatchObject({
      availability: 'unavailable',
      condition: 'unknown',
    });
  });
});
