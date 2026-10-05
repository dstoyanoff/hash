import type { EntityRef } from '@hash/core';
import type { EntityHandle } from '../entity-handle.ts';
import type { IconName } from '../icon-data.ts';
import { ActionButton } from './action-button.tsx';

export interface SceneButtonProps {
  /** A scene (an `action` entity), as a ref like `ha:scene.movie_night` or a handle. */
  entity: EntityRef | EntityHandle<'action'>;

  /** Defaults to the scene's name. */
  name?: string;

  /** Icon id. Defaults to a palette. */
  icon?: IconName;
}

/** Activates a scene. */
export function SceneButton({ entity, name, icon }: SceneButtonProps) {
  return (
    <ActionButton entity={entity} {...(name ? { label: name } : {})} icon={icon ?? 'lu:palette'} />
  );
}
