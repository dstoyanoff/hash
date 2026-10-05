import type { Unsubscribe } from './integration.ts';

/** Tiny listener set shared by integrations. */
export class Emitter<T> {
  #listeners = new Set<(value: T) => void>();

  on(listener: (value: T) => void): Unsubscribe {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  emit(value: T): void {
    for (const listener of Array.from(this.#listeners)) {
      listener(value);
    }
  }

  get size(): number {
    return this.#listeners.size;
  }
}
