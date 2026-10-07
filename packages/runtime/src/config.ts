import type { Integration } from '@hashsome/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** How a project is packaged for deployment: what `hashsome package` does without being told. */
export interface PackageConfig {
  /** What to write: `plain` (the server bundle and client, runs with Node), `compose` (Docker Compose), `helm` (a Helm chart for k3s), `image` (just the container image, for your own manifests). Command-line targets win over this. */
  targets?: ('plain' | 'compose' | 'helm' | 'image')[];

  /** What the image runs on, e.g. `linux/amd64`. Default: the machine that builds it. */
  platform?: string;

  /** The image, service and chart name. Default: the package name. */
  name?: string;

  /** Where the server listens in the image. Default 3000. */
  port?: number;
}

export interface HashsomeConfig {
  /** Backends the runtime proxies to the browser. `@hashsome/runtime` ships no integrations of its
   * own — install whichever you need (e.g. `@hashsome/integration.home-assistant`) and construct them
   * here, typically reading connection details from your own environment variables. */
  integrations?: Integration[];
  port?: number;
  host?: string;

  /** Defaults for `hashsome package`, so deploying is `pnpm package` with no flags. */
  package?: PackageConfig;

  /** Answers the requests a device makes to check that an address is a Home Assistant (its login flow, `/api/`, `/api/config`, `/manifest.json`), so a wall display that only opens a Home Assistant, like the Shelly Wall Display, accepts this server's address. Off by default. Any login is accepted — nothing sits behind it, and Hashsome has no login of its own — so turn it on only for a server on a network you trust. */
  homeAssistantCompat?: boolean;
}

export interface ResolvedConfig {
  root: string;
  integrations: Integration[];
  port: number;
  host: string;
  package: PackageConfig;
  homeAssistantCompat: boolean;
}

export function defineConfig(config: HashsomeConfig): HashsomeConfig {
  return config;
}

export const CONFIG_FILE = 'hashsome.config.ts';

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

/** Applies defaults to a config (and checks it). `PORT` and `HOST` in the environment win over the
 * file, so a container can be told where to listen without rebuilding. */
export function resolveConfig(root: string, user: HashsomeConfig): ResolvedConfig {
  const integrations = user.integrations ?? [];
  assertUniqueIds(integrations);
  return {
    root,
    integrations,
    port: Number(process.env.PORT ?? user.port ?? 3000),
    host: process.env.HOST ?? user.host ?? '0.0.0.0',
    package: user.package ?? {},
    homeAssistantCompat: user.homeAssistantCompat ?? false,
  };
}

/** Loads `<root>/hashsome.config.ts` (if present) and applies defaults. */
export async function loadConfig(root: string): Promise<ResolvedConfig> {
  const file = join(root, CONFIG_FILE);
  let user: HashsomeConfig = {};
  if (existsSync(file)) {
    const mod = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as {
      default?: HashsomeConfig;
    };

    user = mod.default ?? {};
  }

  return resolveConfig(root, user);
}
