import type { EntityBase } from './base.ts';

export type ClimateMode = 'off' | 'heat' | 'cool' | 'auto' | 'heatCool' | 'dry' | 'fanOnly';
export type ClimateAction = 'off' | 'idle' | 'heating' | 'cooling' | 'drying' | 'fan';

export interface ClimateEntity extends EntityBase<'climate'> {
  mode: ClimateMode;

  /** What it is doing right now, when it reports that. */
  action?: ClimateAction;
  targetTemperature?: number;
  currentTemperature?: number;

  /** Relative humidity, 0–100. */
  humidity?: number;
  unit: '°C' | '°F';
  preset?: string;
  capabilities: {
    /** The modes this device supports, in display order. */
    modes: ClimateMode[];
    presets: string[];

    /** Whether a target temperature can be set. */
    targetTemperature: boolean;
    step: number;
    range: { min: number; max: number };
  };
}

export interface ClimateCommands {
  setMode: { mode: ClimateMode };
  setTargetTemperature: { temperature: number };
  setPreset: { preset: string };
}
