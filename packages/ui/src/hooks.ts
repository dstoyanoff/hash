import {
  parseEntityRef,
  type ConnectionStatus,
  type EntityRef,
  type EntityState,
  type ServiceCall,
} from '@hash/core';
import { useCallback, useSyncExternalStore } from 'react';
import { useRemoteClient } from './provider.tsx';

/**
 * Live state of an entity. `undefined` while loading, `null` if the entity does not exist.
 */
export function useEntity(ref: EntityRef): EntityState | null | undefined {
  const client = useRemoteClient();
  return useSyncExternalStore(
    (onChange) => client.subscribe(ref, onChange),
    () => client.getState(ref),
    () => undefined,
  );
}

/** Status of the runtime's connection to the entity's backend (`ha`, `ma`, ...). */
export function useIntegrationStatus(integration: string): ConnectionStatus | undefined {
  const client = useRemoteClient();
  return useSyncExternalStore(
    (onChange) => client.onIntegrationStatusChange(onChange),
    () => client.getIntegrationStatus(integration),
    () => undefined,
  );
}

/** Returns a function that calls a service on the integration that owns `ref`. */
export function useService(ref: EntityRef) {
  const client = useRemoteClient();
  return useCallback(
    (domain: string, service: string, data?: ServiceCall['data']) => {
      const { integration, id } = parseEntityRef(ref);
      return client.callService(integration, {
        domain,
        service,
        entityIds: [id],
        ...(data ? { data } : {}),
      });
    },
    [client, ref],
  );
}
