import { BaseIntegration } from './base-integration.ts';
import { formatEntityRef, type EntityState } from './entity.ts';
import type { ServiceCall } from './integration.ts';

export interface MockEntity {
  state: string;
  attributes?: Record<string, unknown>;
}

export type MockServiceHandler = (
  call: ServiceCall,
  helpers: { update(entityId: string, patch: Partial<MockEntity>): void },
) => void;

export interface MockIntegrationOptions {
  id?: string;
  entities?: Record<string, MockEntity>;
  /** Extra handlers keyed by `domain.service`; defaults cover on/off/toggle and setpoints. */
  services?: Record<string, MockServiceHandler>;
}

const defaultServices: Record<string, MockServiceHandler> = {
  'homeassistant.turn_on': (call, { update }) => setAll(call, update, { state: 'on' }),
  'homeassistant.turn_off': (call, { update }) => setAll(call, update, { state: 'off' }),
  'light.turn_on': (call, { update }) =>
    setAll(call, update, { state: 'on' }, pickAttrs(call.data, ['brightness', 'rgb_color'])),
  'light.turn_off': (call, { update }) => setAll(call, update, { state: 'off' }),
  'climate.set_temperature': (call, { update }) =>
    setAll(call, update, {}, pickAttrs(call.data, ['temperature'])),
};

function pickAttrs(data: Record<string, unknown> | undefined, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (data && key in data) out[key] = data[key];
  return out;
}

function setAll(
  call: ServiceCall,
  update: (entityId: string, patch: Partial<MockEntity>) => void,
  patch: Partial<MockEntity>,
  attributes: Record<string, unknown> = {},
) {
  for (const id of call.entityIds ?? []) {
    update(id, { ...patch, attributes });
  }
}

/** In-memory integration with fixture states, for tests, the gallery and screenshots. */
export class MockIntegration extends BaseIntegration {
  readonly id: string;
  readonly calls: ServiceCall[] = [];
  #services: Record<string, MockServiceHandler>;
  #initial: Record<string, MockEntity>;

  constructor(options: MockIntegrationOptions = {}) {
    super();
    this.id = options.id ?? 'ha';
    this.#initial = options.entities ?? {};
    this.#services = { ...defaultServices, ...options.services };
    this.#load();
  }

  #load() {
    for (const [entityId, entity] of Object.entries(this.#initial)) this.update(entityId, entity);
  }

  connect(): Promise<void> {
    this.setStatus('connected');
    return Promise.resolve();
  }

  disconnect(): void {
    this.setStatus('disconnected');
  }

  /** Set or patch an entity; attributes are merged. */
  update(entityId: string, patch: Partial<MockEntity>): void {
    const current = this.getState(entityId);
    const now = new Date().toISOString();
    const state = patch.state ?? current?.state ?? 'unknown';
    const next: EntityState = {
      ref: formatEntityRef(this.id, entityId),
      state,
      attributes: { ...current?.attributes, ...patch.attributes },
      lastUpdated: now,
      lastChanged: current?.state === state && current.lastChanged ? current.lastChanged : now,
    };
    this.setState(entityId, next);
  }

  callService(call: ServiceCall): Promise<void> {
    this.calls.push(call);
    const handler = this.#services[`${call.domain}.${call.service}`];
    handler?.(call, { update: (id, patch) => this.update(id, patch) });
    return Promise.resolve();
  }
}
