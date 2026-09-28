import type { EntityRef } from '@hash/core';
import { mdiGauge, mdiThermometer, mdiWaterPercent } from '@mdi/js';
import { Icon } from '../icon.tsx';
import { useEntity } from '../hooks.ts';
import { entityStatus, statusLabels, stringAttr } from '../status.ts';

export interface SensorReadoutProps {
  entity: EntityRef;
  /** SVG path. Defaults by device class (temperature, humidity). */
  icon?: string;
}

const deviceClassIcons: Record<string, string> = {
  temperature: mdiThermometer,
  humidity: mdiWaterPercent,
};

function formatValue(raw: string): string {
  const value = Number(raw);
  return raw.trim() !== '' && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : raw;
}

/** Inline value with icon and unit. Shows "Unavailable" / "Unknown" instead of a reading. */
export function SensorReadout({ entity, icon }: SensorReadoutProps) {
  const state = useEntity(entity);
  const status = entityStatus(state);
  const deviceClass = stringAttr(state, 'device_class');
  const unit = stringAttr(state, 'unit_of_measurement');
  const path = icon ?? (deviceClass ? deviceClassIcons[deviceClass] : undefined) ?? mdiGauge;

  return (
    <span className="hash-readout" data-status={status}>
      <Icon path={path} />
      <span>
        {status === 'ready' && state
          ? `${formatValue(state.state)}${unit ? ` ${unit}` : ''}`
          : statusLabels[status as Exclude<typeof status, 'ready'>]}
      </span>
    </span>
  );
}
