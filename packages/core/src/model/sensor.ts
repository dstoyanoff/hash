import type { EntityBase } from './base.ts';

export interface SensorEntity extends EntityBase<'sensor'> {
  /** The reading as text (also for non-numeric sensors: `clear`, `on`). */
  value: string;

  /** The reading as a number, when it is one. */
  numeric?: number;
  unit?: string;

  /** What is measured, e.g. `temperature`, `humidity`, `power`, `energy`. Open vocabulary. `daylight` is one the UI reads: a sensor whose `value` is `on` while the sun is up and `off` while it is down, which a `theme` that follows the sun is pointed at. */
  measurement?: string;
}

/** A sensor has no commands. */
export type SensorCommands = Record<string, never>;
