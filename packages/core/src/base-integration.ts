import { Emitter } from './emitter.ts';
import { formatEntityRef, UnknownEntityError } from './entity.ts';
import type { ConnectionStatus, Integration, Unsubscribe } from './integration.ts';
import type { Entity, EntityInput } from './model/index.ts';

/**
 * Entity store + subscription plumbing shared by integrations. A subclass has three jobs: manage
 * the connection and call `setStatus`; map backend updates to entities and call `setEntity` /
 * `replaceEntities`; translate `command`.
 *
 * Reuse the previous `EntityInput` object for an entity that did not change: the store compares
 * inputs by identity, so subscribers (and React) are only told about real changes.
 */
export abstract class BaseIntegration implements Integration {
  abstract readonly id: string;

  #status: ConnectionStatus = 'disconnected';
  #statusEmitter = new Emitter<ConnectionStatus>();
  #entities = new Map<string, Entity>();

  /** The inputs the stored entities were built from, to skip unchanged ones. */
  #inputs = new Map<string, EntityInput>();
  #entityEmitters = new Map<string, Emitter<Entity | undefined>>();

  get status(): ConnectionStatus {
    return this.#status;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract command(entityId: string, name: string, args?: Record<string, unknown>): Promise<void>;

  onStatusChange(listener: (status: ConnectionStatus) => void): Unsubscribe {
    return this.#statusEmitter.on(listener);
  }

  listEntities(): Entity[] {
    return [...this.#entities.values()];
  }

  getEntity(entityId: string): Entity | undefined {
    return this.#entities.get(entityId);
  }

  subscribe(entityId: string, listener: (entity: Entity | undefined) => void): Unsubscribe {
    if (!this.#entities.has(entityId)) {
      throw new UnknownEntityError(this.id, entityId);
    }

    let emitter = this.#entityEmitters.get(entityId);
    if (!emitter) {
      emitter = new Emitter();
      this.#entityEmitters.set(entityId, emitter);
    }

    const off = emitter.on(listener);
    listener(this.#entities.get(entityId));
    let active = true;
    return () => {
      if (!active) {
        return;
      }

      active = false;
      off();
      if (emitter.size === 0) {
        this.#entityEmitters.delete(entityId);
      }
    };
  }

  /** Notifies listeners only on a real change. Leaving `connected` marks every stored entity
   * `unavailable`, so a dashboard dims instead of going blank; the next `setEntity` /
   * `replaceEntities` after reconnecting restores them. */
  protected setStatus(status: ConnectionStatus): void {
    if (status === this.#status) {
      return;
    }

    const wasConnected = this.#status === 'connected';
    this.#status = status;
    if (wasConnected) {
      this.#markUnavailable();
    }

    this.#statusEmitter.emit(status);
  }

  /** Stores (or removes, with `undefined`) one entity, stamping its `ref`. */
  protected setEntity(entityId: string, input: EntityInput | undefined): void {
    if (input === undefined) {
      this.#inputs.delete(entityId);
      if (this.#entities.delete(entityId)) {
        this.#entityEmitters.get(entityId)?.emit(undefined);
      }

      return;
    }

    if (this.#inputs.get(entityId) === input) {
      return;
    }

    this.#inputs.set(entityId, input);
    const entity = { ...input, ref: formatEntityRef(this.id, entityId) } as Entity;
    this.#entities.set(entityId, entity);
    this.#entityEmitters.get(entityId)?.emit(entity);
  }

  /** Replaces the whole store, notifying only for ids whose input object changed. */
  protected replaceEntities(next: Map<string, EntityInput>): void {
    for (const id of Array.from(this.#entities.keys())) {
      if (!next.has(id)) {
        this.setEntity(id, undefined);
      }
    }

    for (const [id, input] of next) {
      this.setEntity(id, input);
    }
  }

  #markUnavailable(): void {
    this.#inputs.clear();
    for (const [id, entity] of this.#entities) {
      if (entity.availability === 'unavailable') {
        continue;
      }

      const stale = { ...entity, availability: 'unavailable' } as Entity;
      this.#entities.set(id, stale);
      this.#entityEmitters.get(id)?.emit(stale);
    }
  }
}
