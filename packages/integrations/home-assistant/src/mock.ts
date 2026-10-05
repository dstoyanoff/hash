import { MockIntegration, mockLibrary, type EntityInput } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { mapEntity } from './mappers/index.ts';

export interface HomeAssistantMockOptions {
  /** Integration id. Defaults to `ha`. */
  id?: string;

  /** Extra entities, by local id; they replace a default with the same id. */
  entities?: Record<string, EntityInput>;
}

const state = (id: string, value: string, attributes: Record<string, unknown> = {}): HassEntity =>
  ({
    entity_id: id,
    state: value,
    attributes,
    last_changed: '2026-01-01T00:00:00.000Z',
    last_updated: '2026-01-01T00:00:00.000Z',
    context: { id: 'mock', parent_id: null, user_id: null },
  }) as HassEntity;

/** What Home Assistant reports for a representative home: every domain the mappers understand,
 * and the states a dashboard has to handle (off, unavailable, unknown). Raw states, so the mock
 * is built by the same mapping the real integration uses. */
const states = (): HassEntity[] => [
  state('light.plain', 'on', { friendly_name: 'Lamp', supported_color_modes: ['onoff'] }),
  state('light.dimmable', 'on', {
    friendly_name: 'Dimmable light',
    supported_color_modes: ['brightness'],
    brightness: 153,
  }),
  state('light.tunable', 'on', {
    friendly_name: 'Tunable white',
    supported_color_modes: ['color_temp'],
    color_mode: 'color_temp',
    brightness: 255,
    color_temp_kelvin: 2700,
    min_color_temp_kelvin: 2000,
    max_color_temp_kelvin: 6500,
  }),
  state('light.color', 'off', {
    friendly_name: 'Color light',
    supported_color_modes: ['hs'],
    brightness: 255,
    hs_color: [280, 80],
  }),
  state('light.unavailable', 'unavailable', { friendly_name: 'Unplugged light' }),
  state('climate.heater', 'heat', {
    friendly_name: 'Heater',
    hvac_modes: ['off', 'heat'],
    temperature: 21,
    current_temperature: 19.4,
    min_temp: 5,
    max_temp: 30,
    target_temp_step: 0.5,
  }),
  state('climate.thermostat', 'off', {
    friendly_name: 'Thermostat',
    hvac_modes: ['off', 'heat', 'cool', 'auto'],
    temperature: 21.5,
    current_temperature: 18.8,
    preset_modes: ['home', 'away'],
    preset_mode: 'home',
  }),
  state('sensor.temperature', '18.4', {
    friendly_name: 'Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°C',
  }),
  state('sensor.humidity', '52', {
    friendly_name: 'Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
  }),
  state('sensor.power', '9', {
    friendly_name: 'Power',
    device_class: 'power',
    unit_of_measurement: 'W',
  }),
  state('sensor.energy', '84.3', {
    friendly_name: 'Energy',
    device_class: 'energy',
    unit_of_measurement: 'kWh',
  }),
  state('sensor.not_reporting', 'unknown', {
    friendly_name: 'Silent sensor',
    device_class: 'temperature',
  }),
  state('binary_sensor.door', 'off', { friendly_name: 'Door', device_class: 'door' }),
  state('person.dan', 'home', { friendly_name: 'Dan' }),
  state('person.alex', 'not_home', { friendly_name: 'Alex' }),
  state('scene.movie_night', 'scening', { friendly_name: 'Movie night' }),
  state('script.shower', 'off', { friendly_name: 'Shower' }),
  state('vacuum.robot', 'docked', { friendly_name: 'Robot vacuum' }),
  state('switch.coffee_maker', 'off', { friendly_name: 'Coffee maker' }),
  state('fan.exhaust', 'off', { friendly_name: 'Exhaust fan' }),
  state('lock.front_door', 'locked', { friendly_name: 'Front door' }),
  state('media_player.living_room', 'playing', {
    friendly_name: 'Living room',
    media_title: 'Blank Space',
    media_artist: 'More More',
    volume_level: 0.4,
    media_position: 64,
    media_duration: 231,
    media_position_updated_at: new Date().toISOString(),
    shuffle: false,
    // play, pause, seek, volume, mute, previous, next, shuffle and browse.
    supported_features: 163967,
  }),
  state('input_boolean.guest_mode', 'off', { friendly_name: 'Guest mode' }),
];

/** A Home Assistant integration that needs no Home Assistant: representative devices, mapped the
 * same way real ones are, and commands that change their state. For tests, the gallery and
 * dashboards under development. */
export function createMock(options: HomeAssistantMockOptions = {}): MockIntegration {
  const entities: Record<string, EntityInput> = {};
  for (const hass of states()) {
    entities[hass.entity_id] = mapEntity(hass, { temperatureUnit: '°C' });
  }

  return new MockIntegration({
    id: options.id ?? 'ha',
    library: mockLibrary(),
    entities: { ...entities, ...options.entities },
  });
}
