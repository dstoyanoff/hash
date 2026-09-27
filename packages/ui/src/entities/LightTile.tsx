import { parseEntityRef, type EntityRef } from '@hash/core';
import { useState } from 'react';
import { useEntity, useService } from '../hooks.ts';
import { mdiLightbulb, mdiLightbulbOutline, mdiPalette } from '@mdi/js';
import { IconButton, Tile } from '../layout/Tile.tsx';
import { entityStatus, friendlyName, numberAttr, stringArrayAttr } from '../status.ts';

export interface LightTileProps {
  entity: EntityRef;
  /** Defaults to the entity's friendly name. */
  name?: string;
  /** SVG path. Defaults to a bulb. */
  icon?: string;
}

const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];

/** Toggle, drag-to-dim (if dimmable) and a colour picker (if colour capable). */
export function LightTile({ entity, name, icon }: LightTileProps) {
  const state = useEntity(entity);
  const call = useService(entity);
  const [picking, setPicking] = useState(false);

  const status = entityStatus(state);
  const on = state?.state === 'on';
  const modes = stringArrayAttr(state, 'supported_color_modes');
  const dimmable = modes.some((mode) => mode !== 'onoff' && mode !== 'unknown');
  const colour = modes.some((mode) => COLOR_MODES.includes(mode));
  const brightness = numberAttr(state, 'brightness');
  const percent = brightness === undefined ? undefined : Math.round((brightness / 255) * 100);
  const hue =
    numberAttr(state, 'hs_color') ??
    (Array.isArray(state?.attributes.hs_color) ? Number(state?.attributes.hs_color[0]) : 0);

  return (
    <Tile
      label={name ?? friendlyName(state, parseEntityRef(entity).id)}
      icon={icon ?? (on ? mdiLightbulb : mdiLightbulbOutline)}
      status={status}
      active={on}
      secondary={on ? (dimmable && percent !== undefined ? `${percent}%` : 'On') : 'Off'}
      onPress={() => void call('light', 'toggle')}
      {...(dimmable
        ? {
            fill: on ? (brightness ?? 255) / 255 : 0,
            onFillChange: (fill: number) =>
              void (fill <= 0
                ? call('light', 'turn_off')
                : call('light', 'turn_on', {
                    brightness_pct: Math.max(1, Math.round(fill * 100)),
                  })),
          }
        : {})}
      trailing={
        colour && status === 'ready' ? (
          <>
            {picking ? (
              <div className="hash-popover">
                <input
                  className="hash-range hash-range--hue"
                  type="range"
                  min={0}
                  max={360}
                  aria-label="Hue"
                  defaultValue={Number.isFinite(hue) ? hue : 0}
                  onChange={(event) =>
                    void call('light', 'turn_on', { hs_color: [Number(event.target.value), 100] })
                  }
                />
              </div>
            ) : null}
            <IconButton
              path={mdiPalette}
              label="Colour"
              active={picking}
              onClick={() => setPicking((open) => !open)}
            />
          </>
        ) : null
      }
    />
  );
}
