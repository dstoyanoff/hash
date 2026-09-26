import type { EntityRef, EntityState } from './entity.ts';
import type { ConnectionStatus, ServiceCall, Unsubscribe } from './integration.ts';
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

type StateListener = (state: EntityState | null | undefined) => void;

/**
 * Browser-side (and React-free) client for the runtime proxy. Ref-counts
 * subscriptions, resubscribes and reconnects with backoff. Listeners receive
 * `undefined` until the server has answered, then a state or `null` (unknown entity).
 */
export class RemoteClient {
  #options: RemoteClientOptions;
  #socket: WebSocket | undefined;
  #link: LinkStatus = 'closed';
  #linkListeners = new Set<(status: LinkStatus) => void>();
  #integrationStatus = new Map<string, ConnectionStatus>();
  #statusListeners = new Set<() => void>();
  #states = new Map<EntityRef, EntityState | null>();
  #listeners = new Map<EntityRef, Set<StateListener>>();
  #pending = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();
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
    if (!this.#stopped) return;
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

  onIntegrationStatusChange(listener: () => void): Unsubscribe {
    this.#statusListeners.add(listener);
    return () => this.#statusListeners.delete(listener) && undefined;
  }

  getState(ref: EntityRef): EntityState | null | undefined {
    return this.#states.get(ref);
  }

  subscribe(ref: EntityRef, listener: StateListener): Unsubscribe {
    let set = this.#listeners.get(ref);
    if (!set) {
      set = new Set();
      this.#listeners.set(ref, set);
      this.#send({ type: 'subscribe', ref });
    }
    set.add(listener);
    listener(this.#states.get(ref));
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.#listeners.delete(ref);
        this.#send({ type: 'unsubscribe', ref });
      }
    };
  }

  callService(integration: string, call: ServiceCall): Promise<void> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      if (this.#socket?.readyState !== 1) {
        reject(new Error('Not connected to runtime'));
        return;
      }
      this.#pending.set(id, { resolve, reject });
      this.#send({ type: 'call', id, integration, ...call });
    });
  }

  #setLink(status: LinkStatus) {
    if (status === this.#link) return;
    this.#link = status;
    for (const listener of [...this.#linkListeners]) listener(status);
  }

  #send(message: ClientMessage) {
    if (this.#socket?.readyState === 1) this.#socket.send(encodeMessage(message));
  }

  #open() {
    this.#setLink('connecting');
    const socket = (this.#options.createSocket ?? ((url) => new WebSocket(url)))(this.#options.url);
    this.#socket = socket;

    socket.addEventListener('open', () => {
      this.#retry = 0;
      this.#setLink('open');
      for (const ref of this.#listeners.keys()) this.#send({ type: 'subscribe', ref });
    });

    socket.addEventListener('message', (event) => {
      const message = parseServerMessage(String(event.data));
      if (message) this.#handle(message);
    });

    socket.addEventListener('close', () => {
      if (this.#socket !== socket) return;
      this.#socket = undefined;
      for (const { reject } of this.#pending.values()) reject(new Error('Connection lost'));
      this.#pending.clear();
      this.#setLink('closed');
      if (this.#stopped) return;
      const min = this.#options.reconnectMinMs ?? 500;
      const max = this.#options.reconnectMaxMs ?? 10_000;
      const delay = Math.min(max, min * 2 ** this.#retry++);
      this.#timer = setTimeout(() => this.#open(), delay);
    });
  }

  #handle(message: ReturnType<typeof parseServerMessage> & object) {
    switch (message.type) {
      case 'state':
        this.#states.set(message.ref, message.state);
        for (const listener of [...(this.#listeners.get(message.ref) ?? [])]) {
          listener(message.state);
        }
        break;
      case 'status':
        this.#integrationStatus.set(message.integration, message.status);
        for (const listener of [...this.#statusListeners]) listener();
        break;
      case 'result': {
        const pending = this.#pending.get(message.id);
        if (!pending) break;
        this.#pending.delete(message.id);
        if (message.ok) pending.resolve();
        else pending.reject(new Error(message.error));
        break;
      }
    }
  }
}
