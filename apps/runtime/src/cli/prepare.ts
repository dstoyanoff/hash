import { resolve } from 'node:path';
import { loadConfig, type ResolvedConfig } from '../config.ts';
import { discoverDashboards } from '../discovery.ts';
import { generateApp } from '../generate.ts';

export async function prepare(
  options: { gallery?: boolean } = {},
  cwd = process.cwd(),
): Promise<ResolvedConfig> {
  const config = await loadConfig(resolve(cwd));
  const dashboards = discoverDashboards(config.dashboardsDir);
  generateApp(config.root, dashboards, options);
  console.log(
    dashboards.length
      ? `Dashboards: ${dashboards.map((d) => d.id).join(', ')}`
      : `No dashboards found in ${config.dashboardsDir}`,
  );
  return config;
}
