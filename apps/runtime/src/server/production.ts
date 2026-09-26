import express, { type Express } from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { HASH_DIR } from '../generate.ts';
import type { ResolvedConfig } from '../config.ts';
import { Proxy } from './proxy.ts';
import { startIntegrations } from './integrations.ts';
import { attachWebSocket } from './websocket.ts';

export function createApp(clientDir: string): Express {
  const app = express();
  app.disable('x-powered-by');
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });
  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  // SPA fallback: client-side routing handles /, /dashboard/{id}/...
  app.use((_req, res) => {
    // `root` (not a joined path): the client dir lives under `.hash`, which sendFile treats as a dotfile.
    res.sendFile('index.html', { root: clientDir });
  });
  return app;
}

export function startServer(config: ResolvedConfig) {
  const clientDir = join(config.root, HASH_DIR, 'build', 'client');
  const server = createServer(createApp(clientDir));
  const proxy = new Proxy(config.integrations);
  attachWebSocket(server, proxy);
  const stop = startIntegrations(config.integrations, { log: console.log });
  server.listen(config.port, config.host, () => {
    console.log(`hash listening on http://${config.host}:${config.port}`);
  });
  const shutdown = () => {
    stop();
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}
