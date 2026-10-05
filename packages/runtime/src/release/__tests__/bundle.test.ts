import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, expect, test } from 'vitest';
import { bundleServer } from '../bundle.ts';

const fixture = fileURLToPath(new URL('./fixture', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'hash-bundle-'));
afterAll(() => rmSync(out, { recursive: true, force: true }));

test('the server is one file that runs on its own, from a folder with no node_modules', async () => {
  await bundleServer({ root: fixture, outFile: join(out, 'server.mjs') });
  // Nothing is left behind in the project.
  expect(existsSync(join(fixture, '.hashsome-server-entry.ts'))).toBe(false);
  // Nothing in it points at the source tree it was built from.
  expect(readFileSync(join(out, 'server.mjs'), 'utf8')).not.toContain(
    'packages/runtime/node_modules',
  );

  // A client to serve, next to it, as a release has.
  const clientDir = join(out, 'client');
  mkdirSync(clientDir);
  writeFileSync(join(clientDir, 'index.html'), '<!doctype html><title>app</title>');

  const port = 41000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, [join(out, 'server.mjs')], {
    cwd: out,
    env: { PATH: process.env.PATH ?? '', PORT: String(port), HOST: '127.0.0.1' },
    stdio: 'ignore',
  });

  try {
    let health: unknown;
    for (let attempt = 0; attempt < 50 && !health; attempt++) {
      health = await fetch(`http://127.0.0.1:${port}/healthz`)
        .then((response) => response.json())
        .catch(() => undefined);

      if (!health) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    expect(health).toEqual({ status: 'ok' });
    // The client is served, and any route falls back to it.
    const page = await fetch(`http://127.0.0.1:${port}/some/dashboard`).then((r) => r.text());
    expect(page).toContain('<title>app</title>');
  } finally {
    child.kill();
  }
}, 60_000);
