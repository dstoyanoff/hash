import type { ClimateAction, ClimateMode, EntityInput } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { baseOf, num, str, strings } from './common.ts';

/** Home Assistant's HVAC mode names and the model's (camelCase) ones. */
export const HVAC_TO_MODE: Record<string, ClimateMode> = {
  off: 'off',
  heat: 'heat',
  cool: 'cool',
  auto: 'auto',
  heat_cool: 'heatCool',
  dry: 'dry',
  fan_only: 'fanOnly',
};

export const MODE_TO_HVAC: Record<ClimateMode, string> = {
  off: 'off',
  heat: 'heat',
  cool: 'cool',
  auto: 'auto',
  heatCool: 'heat_cool',
  dry: 'dry',
  fanOnly: 'fan_only',
};

const ACTION: Record<string, ClimateAction> = {
  off: 'off',
  idle: 'idle',
  heating: 'heating',
  cooling: 'cooling',
  drying: 'drying',
  fan: 'fan',
};

export function mapClimate(entity: HassEntity, unit: '°C' | '°F'): EntityInput {
  const a = entity.attributes;
  const modes = strings(a.hvac_modes).flatMap((m) => (HVAC_TO_MODE[m] ? [HVAC_TO_MODE[m]] : []));
  const target = num(a.temperature);
  const current = num(a.current_temperature);
  const humidity = num(a.current_humidity);
  const action = ACTION[str(a.hvac_action) ?? ''];
  const preset = str(a.preset_mode);
  return {
    kind: 'climate',
    ...baseOf(entity),
    mode: HVAC_TO_MODE[entity.state] ?? 'off',
    ...(action ? { action } : {}),
    ...(target !== undefined ? { targetTemperature: target } : {}),
    ...(current !== undefined ? { currentTemperature: current } : {}),
    ...(humidity !== undefined ? { humidity } : {}),
    unit,
    ...(preset ? { preset } : {}),
    capabilities: {
      modes: modes.length > 0 ? modes : ['off', 'heat'],
      presets: strings(a.preset_modes),
      targetTemperature: target !== undefined,
      step: num(a.target_temp_step) ?? 0.5,
      range: { min: num(a.min_temp) ?? 5, max: num(a.max_temp) ?? 35 },
    },
  };
}
