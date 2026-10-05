import type { Entity } from '@hashsome/core';

/** Uniform lifecycle of an entity as seen by components. */
export type EntityStatus =
  | 'loading'
  | 'missing'
  | 'unsupported'
  | 'unavailable'
  | 'unknown'
  | 'ready';

/** `undefined` = still loading, `null` = no such entity. */
export function entityStatus(entity: Entity | null | undefined): EntityStatus {
  if (entity === undefined) {
    return 'loading';
  }

  if (entity === null) {
    return 'missing';
  }

  if (entity.availability === 'unavailable') {
    return 'unavailable';
  }

  if (entity.availability === 'unknown') {
    return 'unknown';
  }

  return 'ready';
}

export const statusLabels: Record<Exclude<EntityStatus, 'ready'>, string> = {
  loading: '…',
  missing: 'Not found',
  unsupported: 'Unsupported',
  unavailable: 'Unavailable',
  unknown: 'Unknown',
};

/** Capitalizes just the first character; a no-op on text that's already capitalized. */
export function capitalize(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
