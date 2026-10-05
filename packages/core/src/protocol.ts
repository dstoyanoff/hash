import type { EntityRef } from './entity.ts';
import type { ConnectionStatus } from './integration.ts';
import type { Entity } from './model/index.ts';

/** Messages sent by the browser to the runtime's `/ws` endpoint. */
export type ClientMessage =
  | { type: 'subscribe'; ref: EntityRef }
  | { type: 'unsubscribe'; ref: EntityRef }
  | {
      type: 'command';

      /** Client-chosen id echoed in the matching `result`. */
      id: number;
      ref: EntityRef;
      command: string;
      args?: Record<string, unknown>;
    }
  | {
      /** A read that is not a subscription: one level of a media library, answered by `result`. */
      type: 'query';
      id: number;
      ref: EntityRef;
      query: 'browse';
      args?: Record<string, unknown>;
    }
  | {
      type: 'raw';
      id: number;
      integration: string;
      request: Record<string, unknown>;
    };

/** Messages sent by the runtime to the browser. `entity: null` means the entity does not exist (or
 * was removed). */
export type ServerMessage =
  | { type: 'entity'; ref: EntityRef; entity: Entity | null }
  | { type: 'status'; integration: string; status: ConnectionStatus }
  | { type: 'result'; id: number; ok: true; data?: unknown }
  | { type: 'result'; id: number; ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRef = (value: unknown): value is EntityRef =>
  typeof value === 'string' && /^[^:]+:.+$/.test(value);

/** Parse and validate an untrusted client frame. Returns `undefined` if malformed. */
export function parseClientMessage(raw: string): ClientMessage | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  switch (value.type) {
    case 'subscribe':
    case 'unsubscribe':
      return isRef(value.ref) ? { type: value.type, ref: value.ref } : undefined;
    case 'command': {
      if (typeof value.id !== 'number' || !isRef(value.ref) || typeof value.command !== 'string') {
        return undefined;
      }

      if (value.args !== undefined && !isRecord(value.args)) {
        return undefined;
      }

      return {
        type: 'command',
        id: value.id,
        ref: value.ref,
        command: value.command,
        ...(value.args ? { args: value.args } : {}),
      };
    }

    case 'query': {
      if (
        typeof value.id !== 'number' ||
        !isRef(value.ref) ||
        value.query !== 'browse' ||
        (value.args !== undefined && !isRecord(value.args))
      ) {
        return undefined;
      }

      return {
        type: 'query',
        id: value.id,
        ref: value.ref,
        query: 'browse',
        ...(value.args ? { args: value.args } : {}),
      };
    }

    case 'raw': {
      if (
        typeof value.id !== 'number' ||
        typeof value.integration !== 'string' ||
        !isRecord(value.request)
      ) {
        return undefined;
      }

      return {
        type: 'raw',
        id: value.id,
        integration: value.integration,
        request: value.request,
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

  if (!isRecord(value)) {
    return undefined;
  }

  switch (value.type) {
    case 'entity':
      return isRef(value.ref) && (value.entity === null || isRecord(value.entity))
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
