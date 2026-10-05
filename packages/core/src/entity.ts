/**
 * Entity refs address an entity across integrations: `<integration>:<id>`,
 * e.g. `ha:light.kitchen_lamp` or `ma:living_room`.
 *
 * `KnownEntities` is empty by default. Generated `entities.d.ts` files (see
 * `generateEntityTypes`) augment it so refs autocomplete and are type-checked.
 *
 * The entity itself — the generic model every integration produces — lives in `./model/`.
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

/** Thrown by `Integration.subscribe` (and `command`) for an id the integration does not have. */
export class UnknownEntityError extends Error {
  readonly integration: string;
  readonly entityId: string;

  constructor(integration: string, entityId: string) {
    super(`Unknown entity "${integration}:${entityId}"`);
    this.integration = integration;
    this.entityId = entityId;
    this.name = 'UnknownEntityError';
  }
}
