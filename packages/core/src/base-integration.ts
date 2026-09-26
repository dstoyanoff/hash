import { Emitter } from './emitter.ts';
import type { EntityState } from './entity.ts';
import type { ConnectionStatus, Integration, ServiceCall, Unsubscribe } from './integration.ts';

/**
 * Shared state store + subscription plumbing. Subclasses call `setStatus`,
 * `setState` and `replaceStates` as their backend reports changes.
 */
export abstract class BaseIntegration implements Integration {
  abstract readonly id: string;

  #status: ConnectionStatus = 'disconnected';
  #statusEmitter = new Emitter<ConnectionStatus>();
  #states = new Map<string, EntityState>();
  #entityEmitters = new Map<string, Emitter<EntityState | undefined>>();

  get status(): ConnectionStatus {
    return this.#status;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract callService(call: ServiceCall): Promise<void>;

  onStatusChange(listener: (status: ConnectionStatus) => void): Unsubscribe {
    return this.#statusEmitter.on(listener);
  }

  getState(entityId: string): EntityState | undefined {
    return this.#states.get(entityId);
  }

  getAllStates(): EntityState[] {
    return [...this.#states.values()];
  }

  subscribe(entityId: string, listener: (state: EntityState | undefined) => void): Unsubscribe {
    let emitter = this.#entityEmitters.get(entityId);
    if (!emitter) {
      emitter = new Emitter();
      this.#entityEmitters.set(entityId, emitter);
    }
    const off = emitter.on(listener);
    listener(this.#states.get(entityId));
    return () => {
      off();
      if (emitter.size === 0) this.#entityEmitters.delete(entityId);
    };
  }

  protected setStatus(status: ConnectionStatus): void {
    if (status === this.#status) return;
    this.#status = status;
    this.#statusEmitter.emit(status);
  }

  protected setState(entityId: string, state: EntityState | undefined): void {
    if (state) this.#states.set(entityId, state);
    else this.#states.delete(entityId);
    this.#entityEmitters.get(entityId)?.emit(state);
  }

  /** Replace the full store, notifying subscribers only for ids that changed. */
  protected replaceStates(next: Map<string, EntityState>): void {
    const ids = new Set([...this.#states.keys(), ...next.keys()]);
    for (const id of ids) {
      const before = this.#states.get(id);
      const after = next.get(id);
      if (before === after) continue;
      this.setState(id, after);
    }
  }
}
