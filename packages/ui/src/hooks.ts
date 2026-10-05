import type { ConnectionStatus, Entity, EntityKind, EntityRef, LinkStatus } from '@hash/core';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { toHandle, type CommandSender, type EntityHandle } from './entity-handle.ts';
import { useClient } from './provider.tsx';

// Every `subscribe` handed to `useSyncExternalStore` below is memoized: React resubscribes whenever
// its identity changes, and against a remote runtime each resubscribe is an unsubscribe + subscribe
// message pair whose reply is a new entity object — which re-renders, which resubscribes, without end.

/** Live generic entity. `undefined` while loading (or with no ref), `null` if it does not exist. */
export function useEntity(ref: EntityRef | undefined): Entity | null | undefined {
  const client = useClient();
  const subscribe = useCallback(
    (onChange: () => void) => (ref ? client.subscribe(ref, onChange) : () => {}),
    [client, ref],
  );

  const getSnapshot = useCallback(() => (ref ? client.getEntity(ref) : undefined), [client, ref]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/** Returns a function that runs a named command on `ref`: `command('setVolume', { volume: 0.4 })`. */
export function useCommand(ref: EntityRef | undefined): CommandSender {
  const client = useClient();
  return useCallback(
    (name, args) =>
      ref ? client.command(ref, name, args) : Promise.reject(new Error('No entity to command')),
    [client, ref],
  );
}

/**
 * The handle a card renders from. `source` is an entity ref (resolved live through the client) or a
 * ready-made handle (a custom source, a test) — the id-or-object rule every card follows.
 */
export function useEntityHandle<K extends EntityKind>(
  kind: K,
  source: EntityRef | EntityHandle<K>,
): EntityHandle<K> {
  const ref = typeof source === 'string' ? source : undefined;
  const entity = useEntity(ref);
  const send = useCommand(ref);
  const live = useMemo(() => toHandle(kind, entity, send), [kind, entity, send]);
  return typeof source === 'string' ? live : source;
}

/** Connection between this browser and the runtime. */
export function useConnectionStatus(): LinkStatus {
  const client = useClient();
  const subscribe = useCallback((onChange: () => void) => client.onLinkChange(onChange), [client]);
  return useSyncExternalStore(
    subscribe,
    () => client.link,
    () => 'closed' as const,
  );
}

/** Status of the runtime's connection to a backend (`ha`, `ma`, ...). */
export function useIntegrationStatus(integration: string): ConnectionStatus | undefined {
  const client = useClient();
  const subscribe = useCallback(
    (onChange: () => void) => client.onIntegrationStatusChange(onChange),
    [client],
  );

  return useSyncExternalStore(
    subscribe,
    () => client.getIntegrationStatus(integration),
    () => undefined,
  );
}

const NO_STATUSES: Readonly<Record<string, ConnectionStatus>> = {};

/** Status of every backend integration the runtime reports, keyed by integration id. */
export function useIntegrationStatuses(): Readonly<Record<string, ConnectionStatus>> {
  const client = useClient();
  const subscribe = useCallback(
    (onChange: () => void) => client.onIntegrationStatusChange(onChange),
    [client],
  );

  return useSyncExternalStore(
    subscribe,
    () => client.getIntegrationStatuses(),
    () => NO_STATUSES,
  );
}

/** Runs a backend-specific request no command covers — the escape hatch. Cards never use it. */
export function useCallRaw() {
  const client = useClient();
  return useCallback(
    (integration: string, request: Record<string, unknown>) => client.callRaw(integration, request),
    [client],
  );
}
