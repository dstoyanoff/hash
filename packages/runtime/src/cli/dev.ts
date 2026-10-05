import { resolve } from 'node:path';
import { createServer } from 'vite';
import { loadConfig } from '../config.ts';
import { Proxy } from '../server/proxy.ts';
import { startIntegrations } from '../server/integrations.ts';
import { createViteConfig } from '../vite.ts';

export async function dev() {
  const config = await loadConfig(resolve(process.cwd()));
  const stop = startIntegrations(config.integrations, { log: console.log });
  const server = await createServer(
    createViteConfig(config, new Proxy(config.integrations, { log: console.log })),
  );

  await server.listen();
  server.printUrls();
  const shutdown = () => {
    stop();
    void server.close().then(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
