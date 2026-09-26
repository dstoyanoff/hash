import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface DiscoveredDashboard {
  id: string;
  dir: string;
  /** Absolute path to `src/dashboard.ts` (default export: `defineDashboard({...})`). */
  manifestFile: string;
  /** Absolute path to `src/routes.tsx` (default export: react-router `RouteObject[]`). */
  routesFile: string;
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

/** Finds `<dashboardsDir>/<id>/src/{dashboard.ts,routes.tsx}`. Throws on malformed dashboards. */
export function discoverDashboards(dashboardsDir: string): DiscoveredDashboard[] {
  if (!existsSync(dashboardsDir)) return [];
  const found: DiscoveredDashboard[] = [];
  for (const entry of readdirSync(dashboardsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const dir = join(dashboardsDir, entry.name);
    const manifestFile = join(dir, 'src', 'dashboard.ts');
    // Folders without a dashboard manifest are not dashboards (e.g. shared helpers).
    if (!existsSync(manifestFile)) continue;
    if (!ID.test(entry.name)) {
      throw new Error(`Invalid dashboard folder "${entry.name}": ids must match ${ID}`);
    }
    const routesFile = join(dir, 'src', 'routes.tsx');
    if (!existsSync(routesFile)) {
      throw new Error(`Dashboard "${entry.name}" is missing src/routes.tsx`);
    }
    found.push({ id: entry.name, dir, manifestFile, routesFile });
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}
