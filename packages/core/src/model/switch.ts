import type { EntityBase } from './base.ts';

/** Anything with two states that can be flipped: an outlet, a fan, a lock (on = locked). */
export interface SwitchEntity extends EntityBase<'switch'> {
  on: boolean;
}

export interface SwitchCommands {
  turnOn: void;
  turnOff: void;
  toggle: void;
}
