import {
  parseEntityRef,
  type CommandArgs,
  type CommandName,
  type Entity,
  type EntityKind,
  type EntityRef,
  type KindEntity,
} from '@hashsome/core';
import { entityStatus, type EntityStatus } from './status.ts';

/**
 * What a card needs for one entity of a kind: its current model object and the commands to change
 * it. The cards' `entity` prop takes either an entity ref (resolved through `useEntityHandle`) or
 * one of these, so a custom source — or a test — can drive a card with no backend at all.
 */
export interface EntityHandle<K extends EntityKind> {
  /** `ready` once the entity exists, is the right kind, and is reachable. */
  status: EntityStatus;

  /** The entity, when one was found and is the right kind (whatever its availability). */
  entity: KindEntity<K> | undefined;

  /** Runs a named command; resolves once the backend has accepted it. */
  command<N extends CommandName<K>>(name: N, ...args: CommandArgs<K, N>): Promise<void>;
}

export type CommandSender = (name: string, args?: Record<string, unknown>) => Promise<void>;

/** Builds a handle from what the client reports: `undefined` entity = loading, `null` = missing. */
export function toHandle<K extends EntityKind>(
  kind: K,
  entity: Entity | null | undefined,
  send: CommandSender,
): EntityHandle<K> {
  const matches = entity !== undefined && entity !== null && entity.kind === kind;
  return {
    status:
      matches || entity === undefined || entity === null ? entityStatus(entity) : 'unsupported',
    entity: matches ? (entity as KindEntity<K>) : undefined,
    command: (name, ...args) => send(name, args[0] as Record<string, unknown> | undefined),
  };
}

/** What to call an entity before (or without) its model: the local id of a ref, or nothing for a
 * handle. Keeps a not-found card labelled with what was asked for instead of blank. */
export function fallbackName(source: EntityRef | object | undefined): string {
  return typeof source === 'string' ? parseEntityRef(source).id : '';
}
