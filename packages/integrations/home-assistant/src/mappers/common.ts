import type { Availability } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';

/** The domain of a Home Assistant entity id: `light` for `light.kitchen`. */
export function domainOf(entityId: string): string {
  const index = entityId.indexOf('.');
  return index === -1 ? entityId : entityId.slice(0, index);
}

export function availabilityOf(entity: HassEntity): Availability {
  if (entity.state === 'unavailable') {
    return 'unavailable';
  }

  if (entity.state === 'unknown') {
    return 'unknown';
  }

  return 'ready';
}

/** A file address in an entity attribute. Home Assistant serves its own files from a path like
 * `/api/media_player_proxy/…` that only makes sense on Home Assistant, so those go through
 * `toAssetUrl`; a full address is kept as it is. */
export function fileUrl(value: string, toAssetUrl: (path: string) => string): string {
  return value.startsWith('/') && !value.startsWith('//') ? toAssetUrl(value) : value;
}

export function nameOf(entity: HassEntity): string {
  const name = entity.attributes.friendly_name;
  return typeof name === 'string' && name ? name : entity.entity_id;
}

/** What every mapped entity shares: name, availability, timestamps and the untouched payload. */
export function baseOf(entity: HassEntity) {
  return {
    name: nameOf(entity),
    availability: availabilityOf(entity),
    ...(entity.last_changed ? { lastChanged: entity.last_changed } : {}),
    ...(entity.last_updated ? { lastUpdated: entity.last_updated } : {}),
    raw: { state: entity.state, attributes: entity.attributes } as Record<string, unknown>,
  };
}

export const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** 16-point compass names, by the degrees they start at: a wind from `NNE` comes from 22.5 degrees. */
const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

/** Where the wind comes from in degrees, from what Home Assistant gives: degrees as a number or as
 * text, or a compass name such as `NNW`. Anything else is nothing. */
export function bearing(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return ((value % 360) + 360) % 360;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const degrees = Number(value);
  if (Number.isFinite(degrees)) {
    return ((degrees % 360) + 360) % 360;
  }

  const index = COMPASS.indexOf(value.trim().toUpperCase());
  return index === -1 ? undefined : index * 22.5;
}

export const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

export const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
