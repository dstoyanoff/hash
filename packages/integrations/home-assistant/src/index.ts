import {
  callService as haCallService,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type HassEntities,
  type HassEntity,
} from 'home-assistant-js-websocket';
import {
  assetUrl,
  BaseIntegration,
  UnknownEntityError,
  type BrowseQuery,
  type BrowseResult,
  type EntityInput,
  type ForecastQuery,
  type ForecastResult,
  type HistoryQuery,
  type HistoryResult,
  type Unsubscribe,
} from '@hashsome/core';
import { decodeItemId, toBrowseItem, type HaBrowseMedia } from './browse.ts';
import {
  DEFAULT_BUCKET,
  PERIODS,
  RANGE_MS,
  type HaStatisticsMetadata,
  type HaStatisticsRow,
} from './history.ts';
import { toServiceRequest } from './commands.ts';
import { toForecastPoints, type HaForecastResponse } from './forecast.ts';
import { mapEntity } from './mappers/index.ts';

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

  /** Home Assistant reports its temperature unit in its own config, not per entity. Default `°C`. */
  temperatureUnit?: '°C' | '°F';

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

export class HomeAssistantIntegration extends BaseIntegration {
  readonly id: string;
  #options: HomeAssistantOptions;
  #client: HaClient | undefined;
  #stopEntities: Unsubscribe | undefined;
  #cache = new Map<string, { source: HassEntity; input: EntityInput }>();

  constructor(options: HomeAssistantOptions) {
    super();
    this.id = options.id ?? 'ha';
    this.#options = options;
  }

  async connect(): Promise<void> {
    if (this.#client) {
      return;
    }

    this.setStatus('connecting');
    try {
      const client = await (this.#options.createClient ?? (() => createHaClient(this.#options)))();
      this.#client = client;
      client.on('ready', () => this.setStatus('connected'));
      client.on('disconnected', () => this.setStatus('disconnected'));
      client.on('reconnect-error', () => this.setStatus('error'));
      // `connect()` resolves only once the first full set of entities has arrived, so
      // `listEntities()` is complete — and "unknown entity" can be decided — from then on.
      const firstLoad = new Promise<void>((resolve) => {
        this.#stopEntities = client.subscribeEntities((entities) => {
          this.#applyEntities(entities);
          resolve();
        });
      });

      await firstLoad;
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

  async command(entityId: string, name: string, args?: Record<string, unknown>): Promise<void> {
    const client = this.#requireClient();
    const entity = this.getEntity(entityId);
    if (!entity) {
      throw new UnknownEntityError(this.id, entityId);
    }

    const { domain, service, data } = toServiceRequest(entityId, entity, name, args);
    await client.callService(domain, service, data, { entity_id: [entityId] });
  }

  #assetUrl = (path: string): string => assetUrl(this.id, path);

  /**
   * A sensor's past values from Home Assistant's long-term statistics: the average per bucket for a
   * measurement (temperature, power), or how much the counter grew per bucket for a running total
   * (energy). An entity that has no statistics (not a sensor with a `state_class`) has no points.
   */
  async history(entityId: string, query: HistoryQuery): Promise<HistoryResult> {
    const client = this.#requireClient();
    if (!this.getEntity(entityId)) {
      throw new UnknownEntityError(this.id, entityId);
    }

    const [meta] = await client.sendCommand<HaStatisticsMetadata[]>({
      type: 'recorder/get_statistics_metadata',
      statistic_ids: [entityId],
    });

    if (!meta || (!meta.has_sum && !meta.has_mean)) {
      return { points: [], kind: 'measurement' };
    }

    const total = meta.has_sum;
    const field = total ? 'change' : 'mean';
    const bucket = query.bucket ?? DEFAULT_BUCKET[query.range];
    const found = await client.sendCommand<Record<string, HaStatisticsRow[]>>({
      type: 'recorder/statistics_during_period',
      start_time: new Date(Date.now() - RANGE_MS[query.range]).toISOString(),
      statistic_ids: [entityId],
      period: PERIODS[bucket],
      types: [field],
    });

    const points = (found[entityId] ?? []).flatMap((row) => {
      const value = row[field];
      return typeof value === 'number'
        ? [{ timestamp: new Date(row.start).toISOString(), value }]
        : [];
    });

    const unit = meta.statistics_unit_of_measurement;
    return { points, kind: total ? 'total' : 'measurement', ...(unit ? { unit } : {}) };
  }

  /**
   * A weather entity's forecast, from the `weather.get_forecasts` service (the forecast is no longer
   * part of the entity's state). An entity that does not give that kind of forecast has no points.
   */
  async forecast(entityId: string, query: ForecastQuery): Promise<ForecastResult> {
    const client = this.#requireClient();
    const entity = this.getEntity(entityId);
    if (entity?.kind !== 'weather') {
      throw new UnknownEntityError(this.id, entityId);
    }

    if (!entity.forecasts?.includes(query.type)) {
      return { type: query.type, points: [] };
    }

    const answer = await client.sendCommand<{ response?: HaForecastResponse }>({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      service_data: { type: query.type },
      target: { entity_id: entityId },
      return_response: true,
    });

    return {
      type: query.type,
      points: toForecastPoints(answer.response?.[entityId]?.forecast),
      ...(entity.unit ? { unit: entity.unit } : {}),
      ...(entity.windUnit ? { windUnit: entity.windUnit } : {}),
    };
  }

  /** A file Home Assistant serves (artwork, a person's picture), fetched with the token. Only a
   * path on Home Assistant itself is accepted, never another address. */
  async fetchAsset(path: string): Promise<Response> {
    const base = new URL(this.#options.url);
    const target = new URL(path, base);
    if (!path.startsWith('/') || path.startsWith('//') || target.origin !== base.origin) {
      throw new Error('Not a path on Home Assistant');
    }

    return fetch(target, { headers: { Authorization: `Bearer ${this.#options.token}` } });
  }

  /** One level of the player's own media library, from `media_player/browse_media`. */
  async browse(entityId: string, query: BrowseQuery): Promise<BrowseResult> {
    const client = this.#requireClient();
    const entity = this.getEntity(entityId);
    if (entity?.kind !== 'mediaPlayer') {
      throw new UnknownEntityError(this.id, entityId);
    }

    if (query.search !== undefined) {
      throw new Error('This library cannot be searched');
    }

    const at = query.path === undefined ? undefined : decodeItemId(query.path);
    const level = await client.sendCommand<HaBrowseMedia>({
      type: 'media_player/browse_media',
      entity_id: entityId,
      ...(at ? { media_content_type: at.contentType, media_content_id: at.contentId } : {}),
    });

    return {
      ...(at && level.title ? { title: level.title } : {}),
      items: (level.children ?? []).map((media) => toBrowseItem(media, this.#assetUrl)),
    };
  }

  /** Calls any Home Assistant service: `{ domain, service, entityIds?, data? }`. */
  async callRaw(request: Record<string, unknown>): Promise<unknown> {
    const { domain, service, entityIds, data } = request;
    if (typeof domain !== 'string' || typeof service !== 'string') {
      throw new Error('A raw Home Assistant request needs a "domain" and a "service"');
    }

    const ids = Array.isArray(entityIds) ? entityIds.filter((i) => typeof i === 'string') : [];
    return this.#requireClient().callService(
      domain,
      service,
      data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined,
      ids.length > 0 ? { entity_id: ids } : undefined,
    );
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
    if (!this.#client) {
      throw new Error('Home Assistant integration is not connected');
    }

    return this.#client;
  }

  #applyEntities(entities: HassEntities): void {
    const next = new Map<string, EntityInput>();
    const nextCache = new Map<string, { source: HassEntity; input: EntityInput }>();
    const options = {
      temperatureUnit: this.#options.temperatureUnit ?? '°C',
      assetUrl: this.#assetUrl,
    };

    for (const [id, entity] of Object.entries(entities)) {
      // The HA lib keeps object identity for unchanged entities; reuse our mapped input so
      // replaceEntities only notifies subscribers of real changes.
      const cached = this.#cache.get(id);
      const entry =
        cached && cached.source === entity
          ? cached
          : { source: entity, input: mapEntity(entity, options) };

      nextCache.set(id, entry);
      next.set(id, entry.input);
    }

    this.#cache = nextCache;
    this.replaceEntities(next);
  }
}
