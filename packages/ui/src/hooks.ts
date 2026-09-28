import {
  parseEntityRef,
  type ConnectionStatus,
  type EntityRef,
  type EntityState,
  type LinkStatus,
  type ServiceCall,
} from '@hash/core';
import { useCallback, useSyncExternalStore } from 'react';
import { useClient } from './provider.tsx';

/** Live state of an entity. `undefined` while loading, `null` if the entity does not exist. */
export function useEntity(ref: EntityRef): EntityState | null | undefined {
  const client = useClient();
  return useSyncExternalStore(
    (onChange) => client.subscribe(ref, onChange),
    () => client.getState(ref),
    () => undefined,
  );
}

/** Connection between this browser and the runtime. */
export function useConnectionStatus(): LinkStatus {
  const client = useClient();
  return useSyncExternalStore(
    (onChange) => client.onLinkChange(onChange),
    () => client.link,
    () => 'closed' as const,
  );
}

/** Status of the runtime's connection to a backend (`ha`, `ma`, ...). */
export function useIntegrationStatus(integration: string): ConnectionStatus | undefined {
  const client = useClient();
  return useSyncExternalStore(
    (onChange) => client.onIntegrationStatusChange(onChange),
    () => client.getIntegrationStatus(integration),
    () => undefined,
  );
}

/** Calls a service on an integration: `call('ha', { domain, service, entityIds, data })`. */
export function useCallService() {
  const client = useClient();
  return useCallback(
    (integration: string, call: ServiceCall) => client.callService(integration, call),
    [client],
  );
}

/** Returns a function that calls a service targeting `ref` on the integration that owns it. */
export function useService(ref: EntityRef) {
  const callService = useCallService();
  return useCallback(
    (domain: string, service: string, data?: ServiceCall['data']) => {
      const { integration, id } = parseEntityRef(ref);
      return callService(integration, {
        domain,
        service,
        entityIds: [id],
        ...(data ? { data } : {}),
      });
    },
    [callService, ref],
  );
}
