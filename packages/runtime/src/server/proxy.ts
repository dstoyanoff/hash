import {
  encodeMessage,
  parseClientMessage,
  parseEntityRef,
  type BrowseQuery,
  type ConnectionStatus,
  type EntityRef,
  type Integration,
  type ServerMessage,
  type Unsubscribe,
  UnknownEntityError,
} from '@hash/core';

/** The subset of a `ws` WebSocket the proxy needs. */
export interface ProxySocket {
  send(data: string): void;
  on(event: 'message', listener: (data: { toString(): string }) => void): unknown;
  on(event: 'close' | 'error', listener: () => void): unknown;
  readonly readyState: number;
}

const OPEN = 1;

/** The only fields a browse query has, kept only when they are strings: the rest came from a browser. */
function browseArgs(args: Record<string, unknown> | undefined): BrowseQuery {
  return {
    ...(typeof args?.path === 'string' ? { path: args.path } : {}),
    ...(typeof args?.search === 'string' ? { search: args.search } : {}),
  };
}

/**
 * Multiplexes browser connections onto server-held integrations. Tokens never
 * reach the browser; current states are replayed from the integrations' stores
 * so a waking tablet gets a full picture immediately.
 */
export interface ProxyOptions {
  /** Where problems worth a line in the server log go (an unknown ref, a failed subscribe). */
  log?: (message: string) => void;
}

/**
 * Multiplexes browser connections onto server-held integrations. Tokens never
 * reach the browser; current entities are replayed from the integrations' stores
 * so a waking tablet gets a full picture immediately.
 *
 * The proxy does all the addressing: it parses `<integration>:<id>` and hands the integration only
 * its local id. A subscription is resolved once the owning integration is connected — until then
 * the browser has no answer (a component shows its loading state) — and an id the integration does
 * not have is answered with `entity: null` and logged.
 */
export class Proxy {
  #integrations = new Map<string, Integration>();
  #log: (message: string) => void;

  constructor(integrations: Integration[], options: ProxyOptions = {}) {
    for (const integration of integrations) {
      this.#integrations.set(integration.id, integration);
    }

    this.#log = options.log ?? (() => {});
  }

  handleConnection(socket: ProxySocket): void {
    const send = (message: ServerMessage) => {
      if (socket.readyState === OPEN) {
        socket.send(encodeMessage(message));
      }
    };

    const subscriptions = new Map<EntityRef, Unsubscribe>();
    const cleanups: Unsubscribe[] = [];

    for (const integration of this.#integrations.values()) {
      const report = (status: ConnectionStatus) =>
        send({ type: 'status', integration: integration.id, status });

      report(integration.status);
      cleanups.push(integration.onStatusChange(report));
    }

    const answer = (id: number, outcome: Promise<unknown>) => {
      outcome.then(
        (data) => send({ type: 'result', id, ok: true, ...(data !== undefined ? { data } : {}) }),
        (error: unknown) =>
          send({
            type: 'result',
            id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
      );
    };

    const subscribe = (ref: EntityRef): Unsubscribe => {
      const { integration: integrationId, id } = parseEntityRef(ref);
      const integration = this.#integrations.get(integrationId);
      if (!integration) {
        this.#log(`[proxy] no integration "${integrationId}" for ${ref}`);
        send({ type: 'entity', ref, entity: null });
        return () => {};
      }

      const start = (): Unsubscribe => {
        try {
          return integration.subscribe(id, (entity) =>
            send({ type: 'entity', ref, entity: entity ?? null }),
          );
        } catch (error) {
          if (!(error instanceof UnknownEntityError)) {
            throw error;
          }

          this.#log(`[proxy] ${error.message}`);
          send({ type: 'entity', ref, entity: null });
          return () => {};
        }
      };

      if (integration.status === 'connected') {
        return start();
      }

      let stop: Unsubscribe | undefined;
      const off = integration.onStatusChange((status) => {
        if (status === 'connected' && !stop) {
          stop = start();
        }
      });

      return () => {
        off();
        stop?.();
      };
    };

    socket.on('message', (data) => {
      const message = parseClientMessage(data.toString());
      if (!message) {
        return;
      }

      switch (message.type) {
        case 'subscribe':
          if (!subscriptions.has(message.ref)) {
            subscriptions.set(message.ref, subscribe(message.ref));
          }

          return;
        case 'unsubscribe':
          subscriptions.get(message.ref)?.();
          subscriptions.delete(message.ref);
          return;
        case 'command': {
          const { integration: integrationId, id } = parseEntityRef(message.ref);
          const integration = this.#integrations.get(integrationId);
          answer(
            message.id,
            integration
              ? integration.command(id, message.command, message.args)
              : Promise.reject(new Error(`Unknown integration "${integrationId}"`)),
          );

          return;
        }

        case 'query': {
          const { integration: integrationId, id } = parseEntityRef(message.ref);
          const integration = this.#integrations.get(integrationId);
          answer(
            message.id,
            !integration
              ? Promise.reject(new Error(`Unknown integration "${integrationId}"`))
              : integration.browse
                ? integration.browse(id, browseArgs(message.args))
                : Promise.reject(new Error(`"${integrationId}" has no media library`)),
          );

          return;
        }

        case 'raw': {
          const integration = this.#integrations.get(message.integration);
          answer(
            message.id,
            !integration
              ? Promise.reject(new Error(`Unknown integration "${message.integration}"`))
              : integration.callRaw
                ? integration.callRaw(message.request)
                : Promise.reject(new Error(`"${message.integration}" has no raw requests`)),
          );

          return;
        }
      }
    });

    const dispose = () => {
      for (const off of subscriptions.values()) {
        off();
      }

      subscriptions.clear();
      for (const off of cleanups) {
        off();
      }

      cleanups.length = 0;
    };

    socket.on('close', dispose);
    socket.on('error', dispose);
  }
}
