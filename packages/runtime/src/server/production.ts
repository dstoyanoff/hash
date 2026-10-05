import type { Integration } from '@hashsome/core';
import express, { type Express } from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import type { ResolvedConfig } from '../config.ts';
import { serveAsset } from './assets.ts';
import { Proxy } from './proxy.ts';
import { startIntegrations } from './integrations.ts';
import { attachWebSocket } from './websocket.ts';

export function createApp(clientDir: string, integrations: Integration[] = []): Express {
  const app = express();
  app.disable('x-powered-by');
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((req, res, next) => {
    serveAsset(integrations, req, res).then((served) => (served ? undefined : next()), next);
  });

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  // SPA fallback: client-side routing handles /{id}/...
  app.use((_req, res) => {
    res.sendFile(join(clientDir, 'index.html'));
  });

  return app;
}

/** Where `hashsome build` puts the client, under a project. A packaged release keeps it elsewhere. */
export const BUILT_CLIENT = join('build', 'client');

export function startServer(config: ResolvedConfig, clientDir = join(config.root, BUILT_CLIENT)) {
  const server = createServer(createApp(clientDir, config.integrations));
  const proxy = new Proxy(config.integrations, { log: console.log });
  attachWebSocket(server, proxy);
  const stop = startIntegrations(config.integrations, { log: console.log });
  server.listen(config.port, config.host, () => {
    console.log(`hashsome listening on http://${config.host}:${config.port}`);
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
