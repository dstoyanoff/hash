import { HomeAssistantIntegration, MockIntegration } from '@hash/core';
import { defineConfig } from '@hash/runtime';

// Dogfood instance: serves the dashboards in `examples/`. Set HA_URL/HA_TOKEN to use a real
// Home Assistant, otherwise a mock backend covering every dashboard in `examples/*`.
//
// This is one shared entity list for all of them: two dashboards can legitimately reference the
// same real device (e.g. examples/home's kitchen section and examples/kitchen both use
// `light.kitchen_ceiling`) — reuse the existing key rather than re-declaring it, and check for a
// key collision before adding a new entity here, since a duplicate key silently overrides the
// earlier one with no error from lint/typecheck/tests.
const { HA_URL, HA_TOKEN } = process.env;

export default defineConfig({
  dashboardsDir: 'examples',
  integrations:
    HA_URL && HA_TOKEN
      ? [new HomeAssistantIntegration({ url: HA_URL, token: HA_TOKEN })]
      : [
          new MockIntegration({
            entities: {
              // examples/hello
              'light.lamp': {
                state: 'off',
                attributes: { supported_color_modes: ['brightness'], brightness: 128 },
              },
              'climate.heater': {
                state: 'heat',
                attributes: {
                  hvac_modes: ['off', 'heat'],
                  temperature: 17,
                  current_temperature: 16.4,
                },
              },
              'sensor.temperature': {
                state: '18.04',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },

              // examples/home — downstairs
              'media_player.living_room': {
                state: 'playing',
                attributes: {
                  friendly_name: 'living room',
                  media_title: 'Blank Space',
                  media_artist: 'More More',
                  volume_level: 0.4,
                },
              },
              'sensor.living_room_temperature': {
                state: '18.0',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },
              'sensor.living_room_humidity': {
                state: '64.41',
                attributes: { device_class: 'humidity', unit_of_measurement: '%' },
              },
              'light.living_room_lamp': {
                state: 'on',
                attributes: { supported_color_modes: ['onoff'] },
              },
              'light.living_room_wall': {
                state: 'on',
                attributes: { supported_color_modes: ['brightness'], brightness: 200 },
              },
              'light.living_room_accent': {
                state: 'off',
                attributes: { supported_color_modes: ['hs'], brightness: 255, hs_color: [280, 80] },
              },
              'climate.living_room': {
                state: 'heat',
                attributes: {
                  hvac_modes: ['off', 'heat'],
                  temperature: 17,
                  current_temperature: 16.4,
                  target_temp_step: 0.5,
                  min_temp: 5,
                  max_temp: 30,
                },
              },
              'scene.movie_night': { state: 'scening' },
              'vacuum.robot': { state: 'docked' },

              'sensor.kitchen_temperature': {
                state: '19.6',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },
              'light.kitchen_ceiling': {
                state: 'off',
                attributes: { supported_color_modes: ['onoff'] },
              },
              'light.kitchen_led': {
                state: 'off',
                attributes: { supported_color_modes: ['brightness'], brightness: 0 },
              },
              'scene.cooking_time': { state: 'scening' },

              'sensor.porch_temperature': {
                state: '15.9',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },
              'sensor.porch_humidity': {
                state: '74',
                attributes: { device_class: 'humidity', unit_of_measurement: '%' },
              },
              // Demonstrates the unavailable state on a real dashboard layout.
              'light.porch_lamp': { state: 'unavailable' },
              'light.porch_ambient': {
                state: 'on',
                attributes: { supported_color_modes: ['hs'], brightness: 180, hs_color: [30, 60] },
              },
              'lock.front_door': { state: 'locked' },

              // examples/home — upstairs
              'sensor.master_bedroom_temperature': {
                state: 'unknown',
                attributes: { device_class: 'temperature' },
              },
              'sensor.master_bedroom_humidity': {
                state: 'unknown',
                attributes: { device_class: 'humidity' },
              },
              'light.master_bedroom_lamp': {
                state: 'off',
                attributes: { supported_color_modes: ['hs'], brightness: 255, hs_color: [220, 40] },
              },
              'climate.master_bedroom': {
                state: 'heat',
                attributes: {
                  hvac_modes: ['off', 'heat'],
                  temperature: 19.5,
                  current_temperature: 19.1,
                },
              },

              'sensor.bathroom_temperature': {
                state: '22.3',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },
              'sensor.bathroom_humidity': {
                state: '58',
                attributes: { device_class: 'humidity', unit_of_measurement: '%' },
              },
              'light.bathroom_led': {
                state: 'on',
                attributes: { supported_color_modes: ['brightness'], brightness: 153 },
              },
              'script.shower': { state: 'off' },
              'script.septic_additive': { state: 'off' },

              'sensor.office_temperature': {
                state: '18.8',
                attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
              },
              'sensor.office_humidity': {
                state: '59.08',
                attributes: { device_class: 'humidity', unit_of_measurement: '%' },
              },
              'climate.office': {
                state: 'off',
                attributes: {
                  hvac_modes: ['off', 'heat'],
                  temperature: 21.5,
                  current_temperature: 18.8,
                },
              },
              'scene.focus_mode': { state: 'scening' },

              // examples/kitchen — reuses `light.kitchen_ceiling`, `light.kitchen_led`,
              // `sensor.kitchen_temperature` and `scene.cooking_time` already registered above
              // for examples/home's kitchen section (same physical entities); only the
              // additional devices this dedicated dashboard adds are listed here.
              'light.kitchen_island': {
                state: 'off',
                attributes: { supported_color_modes: ['hs'], brightness: 255, hs_color: [40, 60] },
              },
              'sensor.kitchen_humidity': {
                state: '48',
                attributes: { device_class: 'humidity', unit_of_measurement: '%' },
              },
              'switch.kitchen_coffee_maker': { state: 'off' },
              'fan.kitchen_exhaust': { state: 'off' },
            },
          }),
        ],
});
