import type { EntityRef } from './entity.ts';
import type { ConnectionStatus, Unsubscribe } from './integration.ts';
import type {
  BrowseQuery,
  BrowseResult,
  Entity,
  ForecastQuery,
  ForecastResult,
  HistoryQuery,
  HistoryResult,
} from './model/index.ts';
import { encodeMessage, parseServerMessage, type ClientMessage } from './protocol.ts';

export type LinkStatus = 'connecting' | 'open' | 'closed';

export interface RemoteClientOptions {
  /** WebSocket URL of the runtime, e.g. `ws://localhost:3000/ws`. */
  url: string;

  /** Override for tests / non-browser environments. */
  createSocket?: (url: string) => WebSocket;
  reconnectMinMs?: number;
  reconnectMaxMs?: number;
}

export type EntityListener = (entity: Entity | null | undefined) => void;

/**
 * What the UI layer needs from a backend connection. `RemoteClient` talks to the runtime over
 * WebSocket; `LocalClient` wraps integrations in-process (gallery, tests, demos).
 */
export interface Client {
  readonly link: LinkStatus;
  connect(): void;
  close(): void;
  onLinkChange(listener: (status: LinkStatus) => void): Unsubscribe;

  /** Status of a backend integration (`undefined` until known). */
  getIntegrationStatus(integration: string): ConnectionStatus | undefined;
  onIntegrationStatusChange(listener: () => void): Unsubscribe;

  /** Every known integration's status. The same object is returned until something changes, so
   * it is safe as a `useSyncExternalStore` snapshot. */
  getIntegrationStatuses(): Readonly<Record<string, ConnectionStatus>>;

  /** `undefined` while loading, `null` if the entity does not exist. */
  getEntity(ref: EntityRef): Entity | null | undefined;
  subscribe(ref: EntityRef, listener: EntityListener): Unsubscribe;

  /** Runs a named command on the entity; resolves once the backend accepted it. */
  command(ref: EntityRef, name: string, args?: Record<string, unknown>): Promise<void>;

  /** Lists one level of the entity's media library, or searches it. */
  browse(ref: EntityRef, query: BrowseQuery): Promise<BrowseResult>;

  /** The entity's past values, bucketed, from the backend's own record. */
  history(ref: EntityRef, query: HistoryQuery): Promise<HistoryResult>;

  /** A weather entity's forecast: days, hours or half-days ahead, soonest first. */
  forecast(ref: EntityRef, query: ForecastQuery): Promise<ForecastResult>;

  /** Escape hatch: a backend-specific request, answered with whatever the integration returns. */
  callRaw(integration: string, request: Record<string, unknown>): Promise<unknown>;
}

/**
 * Browser-side (and React-free) client for the runtime proxy. Ref-counts
 * subscriptions, resubscribes and reconnects with backoff. Listeners receive
 * `undefined` until the server has answered, then an entity or `null` (unknown entity).
 */
export class RemoteClient implements Client {
  #options: RemoteClientOptions;
  #socket: WebSocket | undefined;
  #link: LinkStatus = 'closed';
  #linkListeners = new Set<(status: LinkStatus) => void>();
  #integrationStatus = new Map<string, ConnectionStatus>();
  #statusSnapshot: Readonly<Record<string, ConnectionStatus>> = {};
  #statusListeners = new Set<() => void>();
  #entities = new Map<EntityRef, Entity | null>();
  #listeners = new Map<EntityRef, Set<EntityListener>>();
  #pending = new Map<
    number,
    { resolve: (data: unknown) => void; reject: (error: Error) => void }
  >();
  #nextId = 1;
  #retry = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #stopped = true;

  constructor(options: RemoteClientOptions) {
    this.#options = options;
  }

  get link(): LinkStatus {
    return this.#link;
  }

  connect(): void {
    if (!this.#stopped) {
      return;
    }

    this.#stopped = false;
    this.#open();
  }

  close(): void {
    this.#stopped = true;
    clearTimeout(this.#timer);
    this.#socket?.close();
    this.#socket = undefined;
    this.#setLink('closed');
  }

  onLinkChange(listener: (status: LinkStatus) => void): Unsubscribe {
    this.#linkListeners.add(listener);
    return () => this.#linkListeners.delete(listener) && undefined;
  }

  /** Status of a backend integration as reported by the runtime (`undefined` until known). */
  getIntegrationStatus(integration: string): ConnectionStatus | undefined {
    return this.#integrationStatus.get(integration);
  }

  getIntegrationStatuses(): Readonly<Record<string, ConnectionStatus>> {
    return this.#statusSnapshot;
  }

  onIntegrationStatusChange(listener: () => void): Unsubscribe {
    this.#statusListeners.add(listener);
    return () => this.#statusListeners.delete(listener) && undefined;
  }

  getEntity(ref: EntityRef): Entity | null | undefined {
    return this.#entities.get(ref);
  }

  subscribe(ref: EntityRef, listener: EntityListener): Unsubscribe {
    let set = this.#listeners.get(ref);
    if (!set) {
      set = new Set();
      this.#listeners.set(ref, set);
      this.#send({ type: 'subscribe', ref });
    }

    set.add(listener);
    listener(this.#entities.get(ref));
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.#listeners.delete(ref);
        this.#send({ type: 'unsubscribe', ref });
      }
    };
  }

  async command(ref: EntityRef, name: string, args?: Record<string, unknown>): Promise<void> {
    await this.#request((id) => ({
      type: 'command',
      id,
      ref,
      command: name,
      ...(args ? { args } : {}),
    }));
  }

  async browse(ref: EntityRef, query: BrowseQuery): Promise<BrowseResult> {
    return (await this.#request((id) => ({
      type: 'query',
      id,
      ref,
      query: 'browse',
      args: { ...query },
    }))) as BrowseResult;
  }

  async history(ref: EntityRef, query: HistoryQuery): Promise<HistoryResult> {
    return (await this.#request((id) => ({
      type: 'query',
      id,
      ref,
      query: 'history',
      args: { ...query },
    }))) as HistoryResult;
  }

  async forecast(ref: EntityRef, query: ForecastQuery): Promise<ForecastResult> {
    return (await this.#request((id) => ({
      type: 'query',
      id,
      ref,
      query: 'forecast',
      args: { ...query },
    }))) as ForecastResult;
  }

  callRaw(integration: string, request: Record<string, unknown>): Promise<unknown> {
    return this.#request((id) => ({ type: 'raw', id, integration, request }));
  }

  #request(build: (id: number) => ClientMessage): Promise<unknown> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      if (this.#socket?.readyState !== 1) {
        reject(new Error('Not connected to runtime'));
        return;
      }

      this.#pending.set(id, { resolve, reject });
      this.#send(build(id));
    });
  }

  #setLink(status: LinkStatus) {
    if (status === this.#link) {
      return;
    }

    this.#link = status;
    for (const listener of Array.from(this.#linkListeners)) {
      listener(status);
    }
  }

  #send(message: ClientMessage) {
    if (this.#socket?.readyState === 1) {
      this.#socket.send(encodeMessage(message));
    }
  }

  #open() {
    this.#setLink('connecting');
    const socket = (this.#options.createSocket ?? ((url) => new WebSocket(url)))(this.#options.url);
    this.#socket = socket;

    socket.addEventListener('open', () => {
      this.#retry = 0;
      this.#setLink('open');
      for (const ref of this.#listeners.keys()) {
        this.#send({ type: 'subscribe', ref });
      }
    });

    socket.addEventListener('message', (event) => {
      const message = parseServerMessage(String(event.data));
      if (message) {
        this.#handle(message);
      }
    });

    socket.addEventListener('close', () => {
      if (this.#socket !== socket) {
        return;
      }

      this.#socket = undefined;
      for (const { reject } of this.#pending.values()) {
        reject(new Error('Connection lost'));
      }

      this.#pending.clear();
      this.#setLink('closed');
      if (this.#stopped) {
        return;
      }

      const min = this.#options.reconnectMinMs ?? 500;
      const max = this.#options.reconnectMaxMs ?? 10_000;
      const delay = Math.min(max, min * 2 ** this.#retry++);
      this.#timer = setTimeout(() => this.#open(), delay);
    });
  }

  #handle(message: ReturnType<typeof parseServerMessage> & object) {
    switch (message.type) {
      case 'entity':
        this.#entities.set(message.ref, message.entity);
        for (const listener of Array.from(this.#listeners.get(message.ref) ?? [])) {
          listener(message.entity);
        }

        break;
      case 'status':
        this.#integrationStatus.set(message.integration, message.status);
        this.#statusSnapshot = Object.fromEntries(this.#integrationStatus);
        for (const listener of Array.from(this.#statusListeners)) {
          listener();
        }

        break;
      case 'result': {
        const pending = this.#pending.get(message.id);
        if (!pending) {
          break;
        }

        this.#pending.delete(message.id);
        if (message.ok) {
          pending.resolve(message.data);
        } else {
          pending.reject(new Error(message.error));
        }

        break;
      }
    }
  }
}
