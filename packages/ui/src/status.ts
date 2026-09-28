import { isUnavailable, isUnknown, type EntityState } from '@hash/core';

/** Uniform lifecycle of an entity as seen by components. */
export type EntityStatus = 'loading' | 'missing' | 'unavailable' | 'unknown' | 'ready';

export function entityStatus(state: EntityState | null | undefined): EntityStatus {
  if (state === undefined) return 'loading';
  if (state === null) return 'missing';
  if (isUnavailable(state)) return 'unavailable';
  if (isUnknown(state)) return 'unknown';
  return 'ready';
}

export const statusLabels: Record<Exclude<EntityStatus, 'ready'>, string> = {
  loading: '…',
  missing: 'Not found',
  unavailable: 'Unavailable',
  unknown: 'Unknown',
};

export function friendlyName(state: EntityState | null | undefined, fallback: string): string {
  const name = state?.attributes.friendly_name;
  return typeof name === 'string' && name ? name : fallback;
}

/** Numeric attribute or `undefined`. */
export function numberAttr(state: EntityState | null | undefined, key: string): number | undefined {
  const value = state?.attributes[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function stringAttr(state: EntityState | null | undefined, key: string): string | undefined {
  const value = state?.attributes[key];
  return typeof value === 'string' && value ? value : undefined;
}

export function stringArrayAttr(state: EntityState | null | undefined, key: string): string[] {
  const value = state?.attributes[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
