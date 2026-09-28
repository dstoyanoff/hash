import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { loadConfig } from './config.ts';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hash-config-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function writeConfig(source: string) {
  writeFileSync(join(root, 'hash.config.ts'), source);
}

// A dynamically `import()`ed fixture file is plain JS at runtime — Node's type stripping erases
// types without checking them, so a minimal `{ id }` stand-in works without needing @hash/core
// resolvable from a scratch directory outside the workspace.
const fakeIntegration = (id: string) => `{ id: ${JSON.stringify(id)} }`;

test('no hash.config.ts yields defaults and no integrations', async () => {
  const config = await loadConfig(root);
  expect(config.integrations).toEqual([]);
  expect(config.dashboardsDir).toBe(join(root, 'dashboards'));
  expect(config.host).toBe('0.0.0.0');
});

test('integrations from hash.config.ts pass through unchanged', async () => {
  writeConfig(
    `export default { integrations: [${fakeIntegration('ha')}, ${fakeIntegration('ma')}] };`,
  );
  const config = await loadConfig(root);
  expect(config.integrations.map((i) => i.id)).toEqual(['ha', 'ma']);
});

test('two integrations with the same id fail fast with a clear error', async () => {
  writeConfig(
    `export default { integrations: [${fakeIntegration('ha')}, ${fakeIntegration('ha')}] };`,
  );
  await expect(loadConfig(root)).rejects.toThrow(/Duplicate integration id "ha"/);
});

test('a single integration never triggers the duplicate check', async () => {
  writeConfig(`export default { integrations: [${fakeIntegration('ha')}] };`);
  const config = await loadConfig(root);
  expect(config.integrations).toHaveLength(1);
});
