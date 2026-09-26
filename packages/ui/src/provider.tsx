import { RemoteClient, type RemoteClientOptions } from '@hash/core';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

const HashContext = createContext<RemoteClient | null>(null);

export interface HashProviderProps {
  /** Runtime WebSocket URL. Defaults to `/ws` on the current origin. */
  url?: string;
  /** Provide a ready-made client (tests, gallery). */
  client?: RemoteClient;
  clientOptions?: Omit<RemoteClientOptions, 'url'>;
  children: ReactNode;
}

function defaultUrl(): string {
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;
}

/** Connects the tree to the runtime proxy. Render only on the client. */
export function HashProvider({ url, client, clientOptions, children }: HashProviderProps) {
  const instance = useMemo(
    () => client ?? new RemoteClient({ url: url ?? defaultUrl(), ...clientOptions }),
    [client, url, clientOptions],
  );

  useEffect(() => {
    instance.connect();
    return () => instance.close();
  }, [instance]);

  return <HashContext.Provider value={instance}>{children}</HashContext.Provider>;
}

export function useRemoteClient(): RemoteClient {
  const client = useContext(HashContext);
  if (!client) throw new Error('useRemoteClient must be used inside <HashProvider>');
  return client;
}
