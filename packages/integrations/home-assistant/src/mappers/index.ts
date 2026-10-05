import type { EntityInput } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { domainOf } from './common.ts';
import { mapClimate } from './climate.ts';
import { mapLight } from './light.ts';
import { mapMediaPlayer } from './media-player.ts';
import { mapWeather } from './weather.ts';
import { mapAction, mapGeneric, mapPerson, mapSensor, mapSwitch } from './simple.ts';

export interface MapOptions {
  /** Home Assistant reports the temperature unit in its own config, not per entity. */
  temperatureUnit: '°C' | '°F';

  /** Turns a path on Home Assistant into an address the browser can load. Defaults to leaving it. */
  assetUrl?: (path: string) => string;
}

/** Domains that are something to trigger, not something with a state to read. */
export const ACTION_DOMAINS = ['scene', 'script', 'button', 'input_button', 'automation', 'vacuum'];

/** Domains with two states that can be flipped (a lock is "on" while locked). */
export const SWITCH_DOMAINS = ['switch', 'fan', 'input_boolean', 'lock'];

/** Maps a Home Assistant entity to the generic model (everything but `ref`). Pure. */
export function mapEntity(entity: HassEntity, options: MapOptions): EntityInput {
  const domain = domainOf(entity.entity_id);
  switch (domain) {
    case 'media_player':
      return mapMediaPlayer(entity, options.assetUrl);
    case 'light':
      return mapLight(entity);
    case 'climate':
      return mapClimate(entity, options.temperatureUnit);
    case 'sensor':
    case 'binary_sensor':
      return mapSensor(entity);
    case 'person':
      return mapPerson(entity, options.assetUrl);
    case 'weather':
      return mapWeather(entity);
    default:
      if (SWITCH_DOMAINS.includes(domain)) {
        return mapSwitch(entity);
      }

      if (ACTION_DOMAINS.includes(domain)) {
        return mapAction(entity);
      }

      return mapGeneric(entity);
  }
}
