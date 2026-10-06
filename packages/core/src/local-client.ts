import type { Client, EntityListener, LinkStatus } from './client.ts';
import { parseEntityRef, UnknownEntityError, type EntityRef } from './entity.ts';
import type { ConnectionStatus, Integration, Unsubscribe } from './integration.ts';
import type {
  BrowseQuery,
  BrowseResult,
  Entity,
  ForecastQuery,
  ForecastResult,
  HistoryQuery,
  HistoryResult,
  LogbookQuery,
  LogbookResult,
} from './model/index.ts';

/** In-process `Client` over integrations, with no runtime server. Used by the gallery and tests. */
export class LocalClient implements Client {
  #integrations = new Map<string, Integration>();
  #link: LinkStatus = 'closed';
  #linkListeners = new Set<(status: LinkStatus) => void>();
  #statusSnapshot: Readonly<Record<string, ConnectionStatus>> = {};

  constructor(integrations: Integration[]) {
    for (const integration of integrations) {
      this.#integrations.set(integration.id, integration);
    }
  }

  get link(): LinkStatus {
    return this.#link;
  }

  connect(): void {
    if (this.#link === 'open') {
      return;
    }

    this.#setLink('open');
    for (const integration of this.#integrations.values()) {
      void integration.connect();
    }
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

  getIntegrationStatuses(): Readonly<Record<string, ConnectionStatus>> {
    const next = Object.fromEntries(
      [...this.#integrations.values()].map((i) => [i.id, i.status] as const),
    );

    const same =
      Object.keys(next).length === Object.keys(this.#statusSnapshot).length &&
      Object.entries(next).every(([id, status]) => this.#statusSnapshot[id] === status);

    if (!same) {
      this.#statusSnapshot = next;
    }

    return this.#statusSnapshot;
  }

  onIntegrationStatusChange(listener: () => void): Unsubscribe {
    const offs = [...this.#integrations.values()].map((i) => i.onStatusChange(listener));
    return () => offs.forEach((off) => off());
  }

  getEntity(ref: EntityRef): Entity | null {
    const { integration, id } = parseEntityRef(ref);
    return this.#integrations.get(integration)?.getEntity(id) ?? null;
  }

  subscribe(ref: EntityRef, listener: EntityListener): Unsubscribe {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      listener(null);
      return () => {};
    }

    try {
      return source.subscribe(id, (entity) => listener(entity ?? null));
    } catch (error) {
      if (error instanceof UnknownEntityError) {
        listener(null);
        return () => {};
      }

      throw error;
    }
  }

  command(ref: EntityRef, name: string, args?: Record<string, unknown>): Promise<void> {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      return Promise.reject(new Error(`Unknown integration "${integration}"`));
    }

    return source.command(id, name, args);
  }

  browse(ref: EntityRef, query: BrowseQuery): Promise<BrowseResult> {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      return Promise.reject(new Error(`Unknown integration "${integration}"`));
    }

    if (!source.browse) {
      return Promise.reject(new Error(`"${integration}" has no media library`));
    }

    return source.browse(id, query);
  }

  history(ref: EntityRef, query: HistoryQuery): Promise<HistoryResult> {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      return Promise.reject(new Error(`Unknown integration "${integration}"`));
    }

    if (!source.history) {
      return Promise.reject(new Error(`"${integration}" keeps no history`));
    }

    return source.history(id, query);
  }

  forecast(ref: EntityRef, query: ForecastQuery): Promise<ForecastResult> {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      return Promise.reject(new Error(`Unknown integration "${integration}"`));
    }

    if (!source.forecast) {
      return Promise.reject(new Error(`"${integration}" has no forecasts`));
    }

    return source.forecast(id, query);
  }

  logbook(ref: EntityRef, query: LogbookQuery): Promise<LogbookResult> {
    const { integration, id } = parseEntityRef(ref);
    const source = this.#integrations.get(integration);
    if (!source) {
      return Promise.reject(new Error(`Unknown integration "${integration}"`));
    }

    if (!source.logbook) {
      return Promise.reject(new Error(`"${integration}" keeps no activity`));
    }

    return source.logbook(id, query);
  }

  callRaw(integration: string, request: Record<string, unknown>): Promise<unknown> {
    const source = this.#integrations.get(integration);
    if (!source) {
      return Promise.reject(new Error(`Unknown integration "${integration}"`));
    }

    if (!source.callRaw) {
      return Promise.reject(new Error(`Integration "${integration}" has no raw requests`));
    }

    return source.callRaw(request);
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
}
