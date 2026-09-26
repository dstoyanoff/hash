import { HomeAssistantIntegration, type Integration } from '@hash/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface HashConfig {
  /** Folder (relative to the config file) containing one folder per dashboard. Default `dashboards`. */
  dashboardsDir?: string;
  /** Backends the runtime proxies to the browser. Default: Home Assistant from `HA_URL`/`HA_TOKEN`. */
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

export function integrationsFromEnv(env: NodeJS.ProcessEnv = process.env): Integration[] {
  return env.HA_URL && env.HA_TOKEN
    ? [new HomeAssistantIntegration({ url: env.HA_URL, token: env.HA_TOKEN })]
    : [];
}

/** Loads `<root>/hash.config.ts` (if present) and applies defaults and env overrides. */
export async function loadConfig(root: string): Promise<ResolvedConfig> {
  const file = join(root, CONFIG_FILE);
  let user: HashConfig = {};
  if (existsSync(file)) {
    const mod = (await import(pathToFileURL(file).href)) as { default?: HashConfig };
    user = mod.default ?? {};
  }
  return {
    root,
    dashboardsDir: join(root, user.dashboardsDir ?? 'dashboards'),
    integrations: user.integrations ?? integrationsFromEnv(),
    port: Number(process.env.PORT ?? user.port ?? 3000),
    host: process.env.HOST ?? user.host ?? '0.0.0.0',
  };
}
