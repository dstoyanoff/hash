import {
  LocalClient,
  mockAction,
  mockClimate,
  mockLibrary,
  mockLight,
  mockMediaPlayer,
  mockPerson,
  mockSensor,
  MockIntegration,
  type EntityInput,
} from '@hashsome/core';

/** Album art for the gallery's playing demo, served by the docs dev server from `docs/public/`. */
// Under the base path the site is served from (`/hash/` on GitHub Pages), not the domain's root.
const DEMO_ARTWORK = `${import.meta.env.BASE_URL}artwork.jpg`;

const power = (watts: string): EntityInput =>
  mockSensor({ name: 'Power', value: watts, unit: 'W', measurement: 'power' });

const energy = (kwh: string): EntityInput =>
  mockSensor({ name: 'Energy', value: kwh, unit: 'kWh', measurement: 'energy' });

/** Mock entities covering every state the components handle. Refs are `ha:<id>`. */
export function createGalleryIntegration() {
  return new MockIntegration({
    library: mockLibrary(),
    entities: {
      'light.plain_on': mockLight({ name: 'Lamp', on: true }),
      'light.plain_off': mockLight({ name: 'Stairs Lamp' }),
      'light.dimmable': mockLight({ name: 'Bathroom LED', on: true, brightness: 0.6 }),
      'light.color': mockLight({
        name: 'Night Lamp',
        on: true,
        brightness: 1,
        color: { mode: 'temperature', kelvin: 2700 },
        capabilities: {
          colorTemperature: true,
          color: true,
          kelvinRange: { min: 2000, max: 6500 },
        },
      }),
      'light.cct': mockLight({
        name: 'Desk Lamp',
        on: true,
        brightness: 0.78,
        color: { mode: 'temperature', kelvin: 4000 },
        capabilities: { colorTemperature: true, kelvinRange: { min: 2000, max: 6500 } },
      }),
      'light.unavailable': mockLight({ name: 'Porch Lamp', availability: 'unavailable' }),
      'climate.heater': mockClimate({
        name: 'Living Room Heater',
        mode: 'heat',
        action: 'heating',
        humidity: 48,
        targetTemperature: 17,
        currentTemperature: 16.4,
        capabilities: { modes: ['off', 'heat'], step: 0.5, range: { min: 5, max: 30 } },
      }),
      'climate.off': mockClimate({
        name: 'Office Thermostat',
        mode: 'off',
        action: 'off',
        humidity: 41,
        targetTemperature: 21.5,
        currentTemperature: 18.8,
        preset: 'home',
        capabilities: {
          modes: ['off', 'heat', 'cool', 'auto'],
          presets: ['home', 'away', 'sleep'],
        },
      }),
      'climate.unavailable': mockClimate({ name: 'Guest Heater', availability: 'unavailable' }),
      'sensor.heater_power': power('1180'),
      'sensor.heater_energy': energy('84.3'),
      'sensor.thermostat_power': power('0'),
      'sensor.thermostat_energy': energy('31.2'),
      'sensor.lamp_power': power('9'),
      'sensor.lamp_energy': energy('1.64'),
      'sensor.led_power': power('7'),
      'sensor.led_energy': energy('3.2'),
      'sensor.temperature': mockSensor({ value: '18.04', unit: '°C', measurement: 'temperature' }),
      'sensor.humidity': mockSensor({ value: '64.41', unit: '%', measurement: 'humidity' }),
      'sensor.bedroom_humidity': mockSensor({
        name: 'Bedroom humidity',
        value: '22.3',
        unit: '%',
        measurement: 'humidity',
      }),
      'sensor.office_humidity': mockSensor({
        name: 'Office humidity',
        value: '45.8',
        unit: '%',
        measurement: 'humidity',
      }),
      'sensor.unavailable': mockSensor({
        value: '0',
        measurement: 'temperature',
        availability: 'unavailable',
      }),
      'sensor.unknown': mockSensor({
        value: '0',
        measurement: 'humidity',
        availability: 'unknown',
      }),
      'scene.tv_time': mockAction({ name: 'TV Time' }),
      'script.shower': mockAction({ name: 'Shower' }),
      'media_player.living_room': mockMediaPlayer({
        name: 'Living Room',
        playback: 'playing',
        media: {
          title: 'Blank Space',
          artist: 'More More',
          album: '1989',
          artworkUrl: DEMO_ARTWORK,
        },
        volume: 0.4,
        position: 64,
        duration: 231,
        positionUpdatedAt: new Date().toISOString(),
        shuffle: false,
        capabilities: { browse: true, search: true, seek: true, shuffle: true },
      }),
      'media_player.off': mockMediaPlayer({
        name: 'Kitchen Speaker',
        availability: 'unavailable',
        playback: 'off',
      }),
      'person.dan': mockPerson({ name: 'Dan' }),
      'person.alex': mockPerson({ name: 'Alex', location: 'not_home' }),
    },
  });
}

export function createGalleryClient() {
  return new LocalClient([createGalleryIntegration()]);
}
