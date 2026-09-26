import type { EntityRef, EntityState } from './entity.ts';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type Unsubscribe = () => void;

export interface ServiceCall {
  domain: string;
  service: string;
  /** Integration-local entity ids (without the `<integration>:` prefix). */
  entityIds?: string[];
  data?: Record<string, unknown>;
}

/**
 * A backend the runtime can talk to (Home Assistant, Music Assistant, ...).
 * Entity ids handled by an integration are local ids; full refs appear on
 * `EntityState.ref`.
 */
export interface Integration {
  readonly id: string;
  readonly status: ConnectionStatus;

  connect(): Promise<void>;
  disconnect(): void;

  onStatusChange(listener: (status: ConnectionStatus) => void): Unsubscribe;

  getState(entityId: string): EntityState | undefined;
  /** Called immediately with the current state (or `undefined`) and on every change. */
  subscribe(entityId: string, listener: (state: EntityState | undefined) => void): Unsubscribe;

  callService(call: ServiceCall): Promise<void>;
}

export type { EntityRef };
