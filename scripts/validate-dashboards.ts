/**
 * Validates every dashboard under `examples/` (the same discovery the runtime uses):
 * folder/id shape, a routes file, a default-exported manifest, a matching id, and a set
 * viewport. Run via `pnpm validate:dashboards`.
 */
import { discoverDashboards, type DiscoveredDashboard } from '@hash/runtime';
import type { DashboardManifest } from '@hash/core';
import { pathToFileURL } from 'node:url';

const roots = ['examples'];

let ok = true;
const seenIds = new Set<string>();

function fail(dashboard: DiscoveredDashboard, message: string) {
  console.error(`${dashboard.dir}: ${message}`);
  ok = false;
}

for (const root of roots) {
  // Throws on shape violations: a bad folder/id, or a missing routes file.
  let dashboards: DiscoveredDashboard[];
  try {
    dashboards = discoverDashboards(root);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  for (const dashboard of dashboards) {
    const module = (await import(pathToFileURL(dashboard.manifestFile).href)) as {
      default?: DashboardManifest;
    };
    const manifest = module.default;

    if (!manifest || typeof manifest !== 'object') {
      fail(dashboard, 'src/dashboard.ts has no default export from defineDashboard(...)');
      continue;
    }
    if (manifest.id !== dashboard.id) {
      fail(dashboard, `manifest id "${manifest.id}" must match its folder name "${dashboard.id}"`);
    }
    if (seenIds.has(manifest.id)) {
      fail(dashboard, `duplicate dashboard id "${manifest.id}"`);
    }
    seenIds.add(manifest.id);

    const viewport = manifest.viewport;
    const validViewport =
      viewport !== undefined &&
      Number.isFinite(viewport.width) &&
      Number.isFinite(viewport.height) &&
      viewport.width > 0 &&
      viewport.height > 0;
    if (!validViewport) {
      fail(dashboard, 'manifest.viewport must be set with a positive width and height');
    }
  }
}

if (!ok) {
  console.error('\nvalidate:dashboards failed');
  process.exit(1);
}
console.log(`validate:dashboards: ok (${seenIds.size} dashboard${seenIds.size === 1 ? '' : 's'})`);
