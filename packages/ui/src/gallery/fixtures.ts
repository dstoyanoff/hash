import { LocalClient, MockIntegration } from '@hash/core';

/** Mock entities covering every state the components handle. Refs are `ha:<id>`. */
export function createGalleryIntegration() {
  return new MockIntegration({
    entities: {
      'light.plain_on': {
        state: 'on',
        attributes: { friendly_name: 'lamp', supported_color_modes: ['onoff'] },
      },
      'light.plain_off': {
        state: 'off',
        attributes: { friendly_name: 'stairs lamp', supported_color_modes: ['onoff'] },
      },
      'light.dimmable': {
        state: 'on',
        attributes: {
          friendly_name: 'bathroom led',
          supported_color_modes: ['brightness'],
          brightness: 153,
        },
      },
      'light.colour': {
        state: 'off',
        attributes: {
          friendly_name: 'night lamp',
          supported_color_modes: ['hs', 'color_temp'],
          brightness: 255,
          hs_color: [30, 100],
        },
      },
      'light.unavailable': { state: 'unavailable', attributes: { friendly_name: 'porch lamp' } },
      'climate.heater': {
        state: 'heat',
        attributes: {
          friendly_name: 'living room heater',
          hvac_modes: ['off', 'heat'],
          temperature: 17,
          current_temperature: 16.4,
          target_temp_step: 0.5,
          min_temp: 5,
          max_temp: 30,
        },
      },
      'climate.off': {
        state: 'off',
        attributes: {
          friendly_name: 'office thermostat',
          hvac_modes: ['off', 'heat'],
          temperature: 21.5,
          current_temperature: 18.8,
        },
      },
      'climate.unavailable': {
        state: 'unavailable',
        attributes: { friendly_name: 'guest heater' },
      },
      'sensor.temperature': {
        state: '18.04',
        attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
      },
      'sensor.humidity': {
        state: '64.41',
        attributes: { device_class: 'humidity', unit_of_measurement: '%' },
      },
      'sensor.unavailable': { state: 'unavailable', attributes: { device_class: 'temperature' } },
      'sensor.unknown': { state: 'unknown', attributes: { device_class: 'humidity' } },
      'scene.tv_time': { state: 'scening', attributes: { friendly_name: 'tv time' } },
      'script.shower': { state: 'off', attributes: { friendly_name: 'shower' } },
      'media_player.living_room': {
        state: 'playing',
        attributes: {
          friendly_name: 'living room',
          media_title: 'Blank Space',
          media_artist: 'More More',
          volume_level: 0.4,
          is_volume_muted: false,
        },
      },
      'media_player.off': {
        state: 'unavailable',
        attributes: { friendly_name: 'kitchen speaker' },
      },
    },
  });
}

export function createGalleryClient() {
  return new LocalClient([createGalleryIntegration()]);
}
