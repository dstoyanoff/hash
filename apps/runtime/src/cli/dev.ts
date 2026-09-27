import { createServer } from 'vite';
import { Proxy } from '../server/proxy.ts';
import { startIntegrations } from '../server/integrations.ts';
import { createViteConfig } from '../vite.ts';
import { prepare } from './prepare.ts';

export async function dev() {
  const config = await prepare({ gallery: true });
  const stop = startIntegrations(config.integrations, { log: console.log });
  const server = await createServer(createViteConfig(config, new Proxy(config.integrations)));
  await server.listen();
  server.printUrls();
  const shutdown = () => {
    stop();
    void server.close().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
