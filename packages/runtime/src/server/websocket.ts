import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import type { Proxy } from './proxy.ts';

export const WS_PATH = '/ws';

/** Attaches the proxy to `/ws` on an http server, leaving other upgrades (Vite HMR) alone. */
export function attachWebSocket(server: HttpServer, proxy: Proxy): () => void {
  const wss = new WebSocketServer({ noServer: true });
  const onUpgrade = (
    request: import('node:http').IncomingMessage,
    socket: import('node:stream').Duplex,
    head: Buffer,
  ) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== WS_PATH) {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => proxy.handleConnection(ws));
  };

  server.on('upgrade', onUpgrade);
  return () => {
    server.off('upgrade', onUpgrade);
    wss.close();
  };
}
