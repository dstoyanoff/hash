import {
  encodeMessage,
  parseClientMessage,
  parseEntityRef,
  type ConnectionStatus,
  type EntityRef,
  type Integration,
  type ServerMessage,
  type Unsubscribe,
} from '@hash/core';

/** The subset of a `ws` WebSocket the proxy needs. */
export interface ProxySocket {
  send(data: string): void;
  on(event: 'message', listener: (data: { toString(): string }) => void): unknown;
  on(event: 'close' | 'error', listener: () => void): unknown;
  readonly readyState: number;
}

const OPEN = 1;

/**
 * Multiplexes browser connections onto server-held integrations. Tokens never
 * reach the browser; current states are replayed from the integrations' stores
 * so a waking tablet gets a full picture immediately.
 */
export class Proxy {
  #integrations = new Map<string, Integration>();

  constructor(integrations: Integration[]) {
    for (const integration of integrations) this.#integrations.set(integration.id, integration);
  }

  handleConnection(socket: ProxySocket): void {
    const send = (message: ServerMessage) => {
      if (socket.readyState === OPEN) socket.send(encodeMessage(message));
    };
    const subscriptions = new Map<EntityRef, Unsubscribe>();
    const cleanups: Unsubscribe[] = [];

    for (const integration of this.#integrations.values()) {
      const report = (status: ConnectionStatus) =>
        send({ type: 'status', integration: integration.id, status });
      report(integration.status);
      cleanups.push(integration.onStatusChange(report));
    }

    socket.on('message', (data) => {
      const message = parseClientMessage(data.toString());
      if (!message) return;

      switch (message.type) {
        case 'subscribe': {
          if (subscriptions.has(message.ref)) return;
          const { integration: integrationId, id } = parseEntityRef(message.ref);
          const integration = this.#integrations.get(integrationId);
          if (!integration) {
            send({ type: 'state', ref: message.ref, state: null });
            return;
          }
          subscriptions.set(
            message.ref,
            integration.subscribe(id, (state) =>
              send({ type: 'state', ref: message.ref, state: state ?? null }),
            ),
          );
          return;
        }
        case 'unsubscribe':
          subscriptions.get(message.ref)?.();
          subscriptions.delete(message.ref);
          return;
        case 'call': {
          const integration = this.#integrations.get(message.integration);
          if (!integration) {
            send({
              type: 'result',
              id: message.id,
              ok: false,
              error: `Unknown integration "${message.integration}"`,
            });
            return;
          }
          integration
            .callService({
              domain: message.domain,
              service: message.service,
              ...(message.entityIds ? { entityIds: message.entityIds } : {}),
              ...(message.data ? { data: message.data } : {}),
            })
            .then(
              () => send({ type: 'result', id: message.id, ok: true }),
              (error: unknown) =>
                send({
                  type: 'result',
                  id: message.id,
                  ok: false,
                  error: error instanceof Error ? error.message : String(error),
                }),
            );
          return;
        }
      }
    });

    const dispose = () => {
      for (const off of subscriptions.values()) off();
      subscriptions.clear();
      for (const off of cleanups) off();
      cleanups.length = 0;
    };
    socket.on('close', dispose);
    socket.on('error', dispose);
  }
}
