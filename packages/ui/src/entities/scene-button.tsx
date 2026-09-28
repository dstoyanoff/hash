import { parseEntityRef, type EntityRef } from '@hash/core';
import { mdiPalette } from '@mdi/js';
import { useEntity } from '../hooks.ts';
import { friendlyName } from '../status.ts';
import { ActionButton } from './action-button.tsx';

export interface SceneButtonProps {
  /** A `scene.*` entity. */
  entity: EntityRef;
  name?: string;
  icon?: string;
}

/** Activates a scene. */
export function SceneButton({ entity, name, icon }: SceneButtonProps) {
  const state = useEntity(entity);
  return (
    <ActionButton
      label={name ?? friendlyName(state, parseEntityRef(entity).id)}
      icon={icon ?? mdiPalette}
      action={{ domain: 'scene', service: 'turn_on', entity }}
    />
  );
}
