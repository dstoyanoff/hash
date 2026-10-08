import type { Server as HttpServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchForWorkspaceRoot, type InlineConfig, type Plugin } from 'vite';
import type { ResolvedConfig } from './config.ts';
import { serveAsset } from './server/assets.ts';
import { homeAssistantCompat } from './server/ha-compat.ts';
import type { Proxy } from './server/proxy.ts';
import { attachWebSocket } from './server/websocket.ts';

const runtimeRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Dev only: `/healthz`, the `/ws` proxy and the asset route on Vite's own server. */
function hashsomeDevServer(proxy: Proxy, config: ResolvedConfig): Plugin {
  return {
    name: 'hashsome:dev-server',
    configureServer(server) {
      if (config.homeAssistantCompat) {
        server.middlewares.use(homeAssistantCompat());
      }

      server.middlewares.use('/healthz', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end('{"status":"ok"}');
      });

      server.middlewares.use((req, res, next) => {
        serveAsset(config.integrations, req, res).then(
          (served) => (served ? undefined : next()),
          next,
        );
      });

      if (server.httpServer) {
        attachWebSocket(server.httpServer as HttpServer, proxy);
      }
    },
  };
}

/** Whether `HASHSOME_DEBUG` asks for the debug menu: `1` or `true`. */
export function debugRequested(env: NodeJS.ProcessEnv = process.env): boolean {
  const asked = (env['HASHSOME_DEBUG'] ?? '').toLowerCase();
  return asked === '1' || asked === 'true';
}

/** `proxy` is only passed for `dev`; `build` needs no server settings (its prerender starts a private preview server). */
export function createViteConfig(config: ResolvedConfig, proxy?: Proxy): InlineConfig {
  return {
    root: config.root,
    configFile: join(config.root, 'vite.config.ts'),
    // `HASHSOME_DEBUG=1` in the environment shows the debug menu: a constant `@hashsome/ui` reads,
    // replaced in the code Vite serves and builds, the packages' own included.
    define: { HASHSOME_DEBUG_ON: JSON.stringify(debugRequested()) },
    ...(proxy
      ? {
          plugins: [hashsomeDevServer(proxy, config)],
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
