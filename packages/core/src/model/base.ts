import type { EntityRef } from '../entity.ts';

/** `ready`: the state is meaningful. `unavailable`: the device is unreachable. `unknown`:
 * reachable but it has not reported yet. */
export type Availability = 'ready' | 'unavailable' | 'unknown';

/** What every entity has, whatever its kind. See ARCHITECTURE.md ("The generic entity model"). */
export interface EntityBase<K extends string = string> {
  /** `<integration>:<id>`; stamped by `BaseIntegration`, never built by an integration. */
  ref: EntityRef;

  /** What this entity is; selects the model and its commands. */
  kind: K;

  /** Human-readable name, already resolved by the integration. */
  name: string;
  availability: Availability;

  /** ISO 8601: when the state last changed. */
  lastChanged?: string;

  /** ISO 8601: when the backend last reported it. */
  lastUpdated?: string;

  /** The backend's own payload, untouched — an escape hatch for project code, never read by
   * `@hash/ui`. It reaches the browser, so it must hold no credentials. */
  raw?: Record<string, unknown>;
}
