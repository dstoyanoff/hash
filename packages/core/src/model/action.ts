import type { EntityBase } from './base.ts';

/** A one-shot thing to trigger: a scene, a script, a button, a vacuum's start. */
export interface ActionEntity extends EntityBase<'action'> {
  /** ISO 8601, when it last ran. */
  lastTriggered?: string;
}

export interface ActionCommands {
  trigger: void;
}
