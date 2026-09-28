import {
  callService as haCallService,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type HassEntities,
  type HassEntity,
} from 'home-assistant-js-websocket';
import {
  BaseIntegration,
  formatEntityRef,
  type EntityState,
  type ServiceCall,
  type Unsubscribe,
} from '@hash/core';

export interface HaArea {
  area_id: string;
  name: string;
  icon?: string | null;
}

export interface HaEntityRegistryEntry {
  entity_id: string;
  name?: string | null;
  original_name?: string | null;
  area_id?: string | null;
  device_id?: string | null;
  icon?: string | null;
  disabled_by?: string | null;
  hidden_by?: string | null;
}

/** Thin seam over `home-assistant-js-websocket` so the integration can be tested without a server. */
export interface HaClient {
  subscribeEntities(listener: (entities: HassEntities) => void): Unsubscribe;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: { entity_id?: string[] },
  ): Promise<unknown>;
  sendCommand<T>(message: { type: string } & Record<string, unknown>): Promise<T>;
  on(event: 'ready' | 'disconnected' | 'reconnect-error', listener: () => void): void;
  close(): void;
}

export interface HomeAssistantOptions {
  /** Base URL, e.g. `http://homeassistant.local:8123`. */
  url: string;
  /** Long-lived access token. */
  token: string;
  /** Integration id used in entity refs. Defaults to `ha`. */
  id?: string;
  /** Override for tests. */
  createClient?: () => Promise<HaClient>;
}

export async function createHaClient(options: { url: string; token: string }): Promise<HaClient> {
  const auth = createLongLivedTokenAuth(options.url, options.token);
  const connection = await createConnection({ auth });
  return {
    subscribeEntities: (listener) => subscribeEntities(connection, listener),
    callService: (domain, service, data, target) =>
      haCallService(connection, domain, service, data, target),
    sendCommand: (message) => connection.sendMessagePromise(message),
    on: (event, listener) => connection.addEventListener(event, listener),
    close: () => connection.close(),
  };
}

function toEntityState(id: string, integrationId: string, entity: HassEntity): EntityState {
  return {
    ref: formatEntityRef(integrationId, id),
    state: entity.state,
    attributes: entity.attributes,
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
  };
}

export class HomeAssistantIntegration extends BaseIntegration {
  readonly id: string;
  #options: HomeAssistantOptions;
  #client: HaClient | undefined;
  #stopEntities: Unsubscribe | undefined;
  #cache = new Map<string, { source: HassEntity; state: EntityState }>();

  constructor(options: HomeAssistantOptions) {
    super();
    this.id = options.id ?? 'ha';
    this.#options = options;
  }

  async connect(): Promise<void> {
    if (this.#client) return;
    this.setStatus('connecting');
    try {
      const client = await (this.#options.createClient ?? (() => createHaClient(this.#options)))();
      this.#client = client;
      client.on('ready', () => this.setStatus('connected'));
      client.on('disconnected', () => this.setStatus('disconnected'));
      client.on('reconnect-error', () => this.setStatus('error'));
      this.#stopEntities = client.subscribeEntities((entities) => this.#applyEntities(entities));
      this.setStatus('connected');
    } catch (error) {
      this.setStatus('error');
      throw error;
    }
  }

  disconnect(): void {
    this.#stopEntities?.();
    this.#stopEntities = undefined;
    this.#client?.close();
    this.#client = undefined;
    this.setStatus('disconnected');
  }

  async callService(call: ServiceCall): Promise<void> {
    const client = this.#requireClient();
    const target = call.entityIds?.length ? { entity_id: call.entityIds } : undefined;
    await client.callService(call.domain, call.service, call.data, target);
  }

  async getAreas(): Promise<HaArea[]> {
    return this.#requireClient().sendCommand<HaArea[]>({ type: 'config/area_registry/list' });
  }

  async getEntityRegistry(): Promise<HaEntityRegistryEntry[]> {
    return this.#requireClient().sendCommand<HaEntityRegistryEntry[]>({
      type: 'config/entity_registry/list',
    });
  }

  #requireClient(): HaClient {
    if (!this.#client) throw new Error('Home Assistant integration is not connected');
    return this.#client;
  }

  #applyEntities(entities: HassEntities): void {
    const next = new Map<string, EntityState>();
    const nextCache = new Map<string, { source: HassEntity; state: EntityState }>();
    for (const [id, entity] of Object.entries(entities)) {
      // The HA lib keeps object identity for unchanged entities; reuse ours so
      // replaceStates only notifies subscribers of real changes.
      const cached = this.#cache.get(id);
      const entry =
        cached && cached.source === entity
          ? cached
          : { source: entity, state: toEntityState(id, this.id, entity) };
      nextCache.set(id, entry);
      next.set(id, entry.state);
    }
    this.#cache = nextCache;
    this.replaceStates(next);
  }
}

/** Convenience for `hash.config.ts`: builds a `HomeAssistantIntegration` from `HA_URL`/`HA_TOKEN`
 * if both are set, `undefined` otherwise. Not required — construct `HomeAssistantIntegration`
 * directly for anything more specific (a custom `id`, a non-env source for the token, ...). */
export function homeAssistantFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): HomeAssistantIntegration | undefined {
  return env.HA_URL && env.HA_TOKEN
    ? new HomeAssistantIntegration({ url: env.HA_URL, token: env.HA_TOKEN })
    : undefined;
}
