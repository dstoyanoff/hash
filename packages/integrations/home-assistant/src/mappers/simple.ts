import type { EntityInput } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { baseOf, fileUrl, num, str } from './common.ts';

export function mapSensor(entity: HassEntity): EntityInput {
  const unit = str(entity.attributes.unit_of_measurement);
  const measurement = str(entity.attributes.device_class);
  const numeric = entity.state.trim() === '' ? undefined : num(Number(entity.state));
  return {
    kind: 'sensor',
    ...baseOf(entity),
    value: entity.state,
    ...(numeric !== undefined ? { numeric } : {}),
    ...(unit ? { unit } : {}),
    ...(measurement ? { measurement } : {}),
  };
}

/** Home Assistant's sun is `above_horizon` or `below_horizon`; the generic model says it as a `daylight`
 * sensor, `on` while the sun is up. Anything else (unavailable) is passed on as it is. */
export function mapSun(entity: HassEntity): EntityInput {
  const value =
    entity.state === 'above_horizon'
      ? 'on'
      : entity.state === 'below_horizon'
        ? 'off'
        : entity.state;

  return { kind: 'sensor', ...baseOf(entity), value, measurement: 'daylight' };
}

/** `on` for an on/off thing; for a lock, `locked`. */
export function mapSwitch(entity: HassEntity): EntityInput {
  const on = entity.state === 'on' || entity.state === 'locked';
  return { kind: 'switch', ...baseOf(entity), on };
}

export function mapAction(entity: HassEntity): EntityInput {
  const last = str(entity.attributes.last_triggered);
  return { kind: 'action', ...baseOf(entity), ...(last ? { lastTriggered: last } : {}) };
}

export function mapPerson(
  entity: HassEntity,
  toAssetUrl: (path: string) => string = (path) => path,
): EntityInput {
  const raw = str(entity.attributes.entity_picture);
  const picture = raw ? fileUrl(raw, toAssetUrl) : undefined;
  return {
    kind: 'person',
    ...baseOf(entity),
    location: entity.state,
    home: entity.state === 'home',
    ...(picture ? { pictureUrl: picture } : {}),
  };
}

export function mapGeneric(entity: HassEntity): EntityInput {
  const unit = str(entity.attributes.unit_of_measurement);
  return { kind: 'generic', ...baseOf(entity), value: entity.state, ...(unit ? { unit } : {}) };
}
