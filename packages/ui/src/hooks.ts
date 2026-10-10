import type { ConnectionStatus, Entity, EntityKind, EntityRef, LinkStatus } from '@hashsome/core';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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

/** Several live entities at once, in the order of `refs`: for a component that has to know about a list of
 * them without a row of its own for each. Each is `undefined` while loading and `null` if it does not exist. */
export function useEntities(refs: readonly EntityRef[]): (Entity | null | undefined)[] {
  const client = useClient();
  const key = refs.join('\n');
  const kept = useRef<{ key: string; list: (Entity | null | undefined)[] }>({ key: '', list: [] });
  const subscribe = useCallback(
    (onChange: () => void) => {
      const offs =
        key === ''
          ? []
          : key.split('\n').map((ref) => client.subscribe(ref as EntityRef, onChange));

      return () => offs.forEach((off) => off());
    },
    [client, key],
  );

  // The same array while nothing in it changed, so React does not see a new snapshot on every read.
  const getSnapshot = useCallback(() => {
    const list = key === '' ? [] : key.split('\n').map((ref) => client.getEntity(ref as EntityRef));
    const last = kept.current;
    if (
      last.key === key &&
      last.list.length === list.length &&
      list.every((entity, i) => entity === last.list[i])
    ) {
      return last.list;
    }

    kept.current = { key, list };
    return list;
  }, [client, key]);

  return useSyncExternalStore(subscribe, getSnapshot, () => kept.current.list);
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

/**
 * How many times the connection to the runtime has opened. A hook that asked for something while it
 * was down (and got an error) depends on this, so it asks again when the connection is back: a read
 * that failed because the page was ahead of the connection, or because it dropped, is not final.
 */
export function useReconnects(): number {
  const link = useConnectionStatus();
  const [opened, setOpened] = useState(0);
  const was = useRef(link);
  useEffect(() => {
    if (link === 'open' && was.current !== 'open') {
      setOpened((count) => count + 1);
    }

    was.current = link;
  }, [link]);

  return opened;
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
