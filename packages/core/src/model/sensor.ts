import type { EntityBase } from './base.ts';

export interface SensorEntity extends EntityBase<'sensor'> {
  /** The reading as text (also for non-numeric sensors: `clear`, `on`). */
  value: string;

  /** The reading as a number, when it is one. */
  numeric?: number;
  unit?: string;

  /** What is measured, e.g. `temperature`, `humidity`, `power`, `energy`. Open vocabulary. */
  measurement?: string;
}

/** A sensor has no commands. */
export type SensorCommands = Record<string, never>;
