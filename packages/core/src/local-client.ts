import type { Client, LinkStatus, StateListener } from './client.ts';
import { parseEntityRef, type EntityRef, type EntityState } from './entity.ts';
import type { ConnectionStatus, Integration, ServiceCall, Unsubscribe } from './integration.ts';

/** In-process `Client` over integrations, with no runtime server. Used by the gallery and tests. */
export class LocalClient implements Client {
  #integrations = new Map<string, Integration>();
  #link: LinkStatus = 'closed';
  #linkListeners = new Set<(status: LinkStatus) => void>();

  constructor(integrations: Integration[]) {
    for (const integration of integrations) this.#integrations.set(integration.id, integration);
  }

  get link(): LinkStatus {
    return this.#link;
  }

  connect(): void {
    if (this.#link === 'open') return;
    this.#setLink('open');
    for (const integration of this.#integrations.values()) void integration.connect();
  }

  close(): void {
    this.#setLink('closed');
  }

  onLinkChange(listener: (status: LinkStatus) => void): Unsubscribe {
    this.#linkListeners.add(listener);
    return () => {
      this.#linkListeners.delete(listener);
    };
  }

  getIntegrationStatus(integration: string): ConnectionStatus | undefined {
    return this.#integrations.get(integration)?.status;
  }

  onIntegrationStatusChange(listener: () => void): Unsubscribe {
    const offs = [...this.#integrations.values()].map((i) => i.onStatusChange(listener));
    return () => offs.forEach((off) => off());
  }

  getState(ref: EntityRef): EntityState | null {
    const { integration, id } = parseEntityRef(ref);
    return this.#integrations.get(integration)?.getState(id) ?? null;
  }

  subscribe(ref: EntityRef, listener: StateListener): Unsubscribe {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      listener(null);
      return () => {};
    }
    return source.subscribe(id, (state) => listener(state ?? null));
  }

  callService(integration: string, call: ServiceCall): Promise<void> {
    const source = this.#integrations.get(integration);
    if (!source) return Promise.reject(new Error(`Unknown integration "${integration}"`));
    return source.callService(call);
  }

  #setLink(status: LinkStatus) {
    if (status === this.#link) return;
    this.#link = status;
    for (const listener of [...this.#linkListeners]) listener(status);
  }
}
