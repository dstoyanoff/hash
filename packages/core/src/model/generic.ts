import type { EntityBase } from './base.ts';

/** An entity with no dedicated kind: shown, not controlled. */
export interface GenericEntity extends EntityBase<'generic'> {
  value: string;
  unit?: string;
}

export type GenericCommands = Record<string, never>;
