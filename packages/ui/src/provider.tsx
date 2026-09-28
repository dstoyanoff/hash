import { RemoteClient, type Client, type RemoteClientOptions } from '@hash/core';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

const HashContext = createContext<Client | null>(null);

export interface HashProviderProps {
  /** Runtime WebSocket URL. Defaults to `/ws` on the current origin. */
  url?: string;
  /** Provide a ready-made client (gallery, tests). */
  client?: Client;
  clientOptions?: Omit<RemoteClientOptions, 'url'>;
  children: ReactNode;
}

function defaultUrl(): string {
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;
}

/** Connects the tree to the runtime proxy. Render only on the client. */
export function HashProvider({ url, client, clientOptions, children }: HashProviderProps) {
  const instance = useMemo<Client>(
    () => client ?? new RemoteClient({ url: url ?? defaultUrl(), ...clientOptions }),
    [client, url, clientOptions],
  );

  useEffect(() => {
    instance.connect();
    return () => instance.close();
  }, [instance]);

  return <HashContext.Provider value={instance}>{children}</HashContext.Provider>;
}

export function useClient(): Client {
  const client = useContext(HashContext);
  if (!client) throw new Error('Hash hooks must be used inside <HashProvider>');
  return client;
}
