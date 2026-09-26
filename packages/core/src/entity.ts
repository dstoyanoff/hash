/**
 * Entity refs address an entity across integrations: `<integration>:<id>`,
 * e.g. `ha:light.kitchen_lamp` or `ma:player.living_room`.
 *
 * `KnownEntities` is empty by default. Generated `entities.d.ts` files (see
 * `generateEntityTypes`) augment it so refs autocomplete and are type-checked.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface KnownEntities {}

export type EntityRef = keyof KnownEntities extends never
  ? `${string}:${string}`
  : Extract<keyof KnownEntities, string>;

export interface ParsedEntityRef {
  integration: string;
  id: string;
}

export function parseEntityRef(ref: string): ParsedEntityRef {
  const index = ref.indexOf(':');
  if (index <= 0 || index === ref.length - 1) {
    throw new Error(`Invalid entity ref "${ref}", expected "<integration>:<id>"`);
  }
  return { integration: ref.slice(0, index), id: ref.slice(index + 1) };
}

export function formatEntityRef(integration: string, id: string): EntityRef {
  return `${integration}:${id}` as EntityRef;
}

/** Domain of an integration-local id, e.g. `light` for `light.kitchen_lamp`. */
export function entityDomain(id: string): string {
  const index = id.indexOf('.');
  return index === -1 ? id : id.slice(0, index);
}

export interface EntityState {
  ref: EntityRef;
  /** Raw state string, e.g. `on`, `off`, `21.5`, `unavailable`. */
  state: string;
  attributes: Record<string, unknown>;
  lastChanged?: string;
  lastUpdated?: string;
}

export function isUnavailable(state: EntityState | undefined): boolean {
  return state === undefined || state.state === 'unavailable';
}

export function isUnknown(state: EntityState | undefined): boolean {
  return state !== undefined && state.state === 'unknown';
}
