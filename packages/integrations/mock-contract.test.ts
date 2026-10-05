import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

// Every integration package has to ship a mock (`./mock` → `createMock`) and run the shared
// conformance suite against it, so any device can be tried without a backend. A new integration
// can't skip either: this test fails for it until it has both.
const here = import.meta.dirname;
const packages = readdirSync(here, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(here, entry.name, 'package.json')))
  .map((entry) => entry.name);

describe.each(packages)('integration %s', (dir) => {
  const root = join(here, dir);
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    exports?: Record<string, string>;
  };

  test('exports a mock at ./mock', () => {
    const target = manifest.exports?.['./mock'];
    expect(target, 'add "./mock" to package.json exports').toBeDefined();
    expect(existsSync(join(root, target ?? '')), `${target} does not exist`).toBe(true);
    expect(readFileSync(join(root, target ?? ''), 'utf8')).toMatch(/export function createMock\b/);
  });

  test('runs the conformance suite against that mock', () => {
    const tests = join(root, 'src', '__tests__');
    const files = existsSync(tests) ? readdirSync(tests) : [];
    const runs = files.some((file) =>
      readFileSync(join(tests, file), 'utf8').includes('runIntegrationConformance('),
    );

    expect(runs, 'call runIntegrationConformance() from a test in src/__tests__').toBe(true);
  });
});

test('there are integrations to check', () => {
  expect(packages.length).toBeGreaterThan(0);
});
