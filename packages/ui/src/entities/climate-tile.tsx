import { parseEntityRef, type EntityRef } from '@hash/core';
import { mdiFire, mdiMinus, mdiPlus, mdiPower, mdiThermostat } from '@mdi/js';
import { useEntity, useService } from '../hooks.ts';
import { IconButton, Tile } from '../layout/tile.tsx';
import { entityStatus, friendlyName, numberAttr, stringArrayAttr } from '../status.ts';

export interface ClimateTileProps {
  entity: EntityRef;
  name?: string;
  icon?: string;
  /** Unit label; Home Assistant does not report it per entity. Default `°C`. */
  unit?: string;
}

/** Heater / thermostat: on-off mode button and a target temperature stepper. */
export function ClimateTile({ entity, name, icon, unit = '°C' }: ClimateTileProps) {
  const state = useEntity(entity);
  const call = useService(entity);

  const status = entityStatus(state);
  const mode = state?.state ?? 'off';
  const running = mode !== 'off';
  const target = numberAttr(state, 'temperature');
  const current = numberAttr(state, 'current_temperature');
  const step = numberAttr(state, 'target_temp_step') ?? 0.5;
  const min = numberAttr(state, 'min_temp') ?? 5;
  const max = numberAttr(state, 'max_temp') ?? 35;
  const modes = stringArrayAttr(state, 'hvac_modes');
  const onMode = modes.includes('heat') ? 'heat' : (modes.find((m) => m !== 'off') ?? 'heat');

  const setTarget = (value: number) =>
    void call('climate', 'set_temperature', {
      temperature: Math.min(max, Math.max(min, Math.round(value * 100) / 100)),
    });

  return (
    <Tile
      label={name ?? friendlyName(state, parseEntityRef(entity).id)}
      icon={icon ?? mdiThermostat}
      status={status}
      secondary={current !== undefined ? `${current} ${unit}` : undefined}
      trailing={
        status === 'ready' ? (
          <>
            <IconButton
              path={running ? mdiFire : mdiPower}
              label={running ? 'Turn off' : 'Turn on'}
              active={running}
              onClick={() =>
                void call('climate', 'set_hvac_mode', { hvac_mode: running ? 'off' : onMode })
              }
            />
            {target !== undefined ? (
              <div className="hash-stepper">
                <IconButton
                  path={mdiMinus}
                  label="Decrease"
                  disabled={target <= min}
                  onClick={() => setTarget(target - step)}
                />
                <span className="hash-stepper__value">
                  {target} {unit}
                </span>
                <IconButton
                  path={mdiPlus}
                  label="Increase"
                  disabled={target >= max}
                  onClick={() => setTarget(target + step)}
                />
              </div>
            ) : null}
          </>
        ) : null
      }
    />
  );
}
