import type { Server as HttpServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchForWorkspaceRoot, type InlineConfig, type Plugin } from 'vite';
import type { ResolvedConfig } from './config.ts';
import type { Proxy } from './server/proxy.ts';
import { attachWebSocket } from './server/websocket.ts';

const runtimeRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Dev only: `/healthz` and the `/ws` proxy on Vite's own server. */
function hashDevServer(proxy: Proxy): Plugin {
  return {
    name: 'hash:dev-server',
    configureServer(server) {
      server.middlewares.use('/healthz', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end('{"status":"ok"}');
      });

      if (server.httpServer) {
        attachWebSocket(server.httpServer as HttpServer, proxy);
      }
    },
  };
}

/** `proxy` is only passed for `dev`; `build` needs no server settings (its prerender starts a private preview server). */
export function createViteConfig(config: ResolvedConfig, proxy?: Proxy): InlineConfig {
  return {
    root: config.root,
    configFile: join(config.root, 'vite.config.ts'),
    ...(proxy
      ? {
          plugins: [hashDevServer(proxy)],
          server: {
            host: config.host,
            port: config.port,
            strictPort: true,
            fs: { allow: [searchForWorkspaceRoot(config.root), runtimeRoot] },
          },
        }
      : {}),
  };
}
