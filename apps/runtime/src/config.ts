import type { Integration } from '@hash/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface HashConfig {
  /** Folder (relative to the config file) containing one folder per dashboard. Default `dashboards`. */
  dashboardsDir?: string;
  /** Backends the runtime proxies to the browser. `@hash/runtime` ships no integrations of its
   * own — install whichever you need (e.g. `@hash/integration-home-assistant`) and construct them
   * here. Many integration packages export an `xFromEnv()` convenience helper for the common
   * "read a URL and a token from the environment" case; see that package's docs. */
  integrations?: Integration[];
  port?: number;
  host?: string;
}

export interface ResolvedConfig {
  root: string;
  dashboardsDir: string;
  integrations: Integration[];
  port: number;
  host: string;
}

export function defineConfig(config: HashConfig): HashConfig {
  return config;
}

export const CONFIG_FILE = 'hash.config.ts';

/** Throws if two integrations were configured with the same `id` — each id is a claimed entity-ref
 * prefix, and a silent collision (whichever integration was constructed last would simply win in
 * every `Map`-keyed lookup) is exactly the kind of bug that's worth catching at startup. */
function assertUniqueIds(integrations: Integration[]): void {
  const seen = new Map<string, number>();
  for (const [index, integration] of integrations.entries()) {
    const firstIndex = seen.get(integration.id);
    if (firstIndex !== undefined) {
      throw new Error(
        `Duplicate integration id "${integration.id}" (integrations[${firstIndex}] and ` +
          `integrations[${index}]). Each integration's id becomes its entity-ref prefix ` +
          `(e.g. "${integration.id}:some.entity") and must be unique — pass a distinct \`id\` ` +
          'to one of them.',
      );
    }
    seen.set(integration.id, index);
  }
}

/** Loads `<root>/hash.config.ts` (if present) and applies defaults. */
export async function loadConfig(root: string): Promise<ResolvedConfig> {
  const file = join(root, CONFIG_FILE);
  let user: HashConfig = {};
  if (existsSync(file)) {
    const mod = (await import(pathToFileURL(file).href)) as { default?: HashConfig };
    user = mod.default ?? {};
  }
  const integrations = user.integrations ?? [];
  assertUniqueIds(integrations);
  return {
    root,
    dashboardsDir: join(root, user.dashboardsDir ?? 'dashboards'),
    integrations,
    port: Number(process.env.PORT ?? user.port ?? 3000),
    host: process.env.HOST ?? user.host ?? '0.0.0.0',
  };
}
