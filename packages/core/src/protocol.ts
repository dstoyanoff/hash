import type { EntityRef, EntityState } from './entity.ts';
import type { ConnectionStatus } from './integration.ts';

/** Messages sent by the browser to the runtime's `/ws` endpoint. */
export type ClientMessage =
  | { type: 'subscribe'; ref: EntityRef }
  | { type: 'unsubscribe'; ref: EntityRef }
  | {
      type: 'call';
      /** Client-chosen id echoed in the matching `result`. */
      id: number;
      integration: string;
      domain: string;
      service: string;
      entityIds?: string[];
      data?: Record<string, unknown>;
    };

/** Messages sent by the runtime to the browser. */
export type ServerMessage =
  /** `state: null` means the entity does not exist (or was removed). */
  | { type: 'state'; ref: EntityRef; state: EntityState | null }
  | { type: 'status'; integration: string; status: ConnectionStatus }
  | { type: 'result'; id: number; ok: true }
  | { type: 'result'; id: number; ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRef = (value: unknown): value is EntityRef =>
  typeof value === 'string' && /^[^:]+:.+$/.test(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Parse and validate an untrusted client frame. Returns `undefined` if malformed. */
export function parseClientMessage(raw: string): ClientMessage | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;

  switch (value.type) {
    case 'subscribe':
    case 'unsubscribe':
      return isRef(value.ref) ? { type: value.type, ref: value.ref } : undefined;
    case 'call': {
      if (
        typeof value.id !== 'number' ||
        typeof value.integration !== 'string' ||
        typeof value.domain !== 'string' ||
        typeof value.service !== 'string'
      ) {
        return undefined;
      }
      if (value.entityIds !== undefined && !isStringArray(value.entityIds)) return undefined;
      if (value.data !== undefined && !isRecord(value.data)) return undefined;
      return {
        type: 'call',
        id: value.id,
        integration: value.integration,
        domain: value.domain,
        service: value.service,
        ...(value.entityIds ? { entityIds: value.entityIds } : {}),
        ...(value.data ? { data: value.data } : {}),
      };
    }
    default:
      return undefined;
  }
}

export function parseServerMessage(raw: string): ServerMessage | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;

  switch (value.type) {
    case 'state':
      return isRef(value.ref) && (value.state === null || isRecord(value.state))
        ? (value as ServerMessage)
        : undefined;
    case 'status':
      return typeof value.integration === 'string' && typeof value.status === 'string'
        ? (value as ServerMessage)
        : undefined;
    case 'result':
      return typeof value.id === 'number' && typeof value.ok === 'boolean'
        ? (value as ServerMessage)
        : undefined;
    default:
      return undefined;
  }
}

export const encodeMessage = (message: ClientMessage | ServerMessage): string =>
  JSON.stringify(message);
