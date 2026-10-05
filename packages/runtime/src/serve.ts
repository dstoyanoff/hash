import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig, type HashConfig } from './config.ts';
import { startServer } from './server/production.ts';

/**
 * The entry of a packaged release: runs the server for an already-imported config, serving the
 * client that sits next to the bundle (`./client`). `hash-dash package` bundles this together with
 * the project's `hash.config.ts` and its integrations into one file, so nothing else is installed
 * where it runs.
 */
export function serve(user: HashConfig, bundleUrl: string): void {
  const here = dirname(fileURLToPath(bundleUrl));
  startServer(resolveConfig(here, user), `${here}/client`);
}
