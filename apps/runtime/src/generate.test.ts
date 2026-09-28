import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { generateApp } from './generate.ts';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hash-generate-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test('generates one splat route per dashboard plus home', () => {
  const dashboards = ['a', 'b'].map((id) => ({
    id,
    dir: `/x/${id}`,
    manifestFile: `/x/${id}/src/dashboard.ts`,
    routesFile: `/x/${id}/src/routes.tsx`,
  }));
  const hashDir = generateApp(root, dashboards);
  const routes = readFileSync(join(hashDir, 'app/routes.ts'), 'utf8');
  expect(routes).toContain('path: "dashboard/a/*"');
  expect(routes).toContain('path: "dashboard/b/*"');
  expect(routes).toContain("index: true, file: 'routes/home.ts'");
  expect(readFileSync(join(hashDir, 'app/routes/dashboard.a.ts'), 'utf8')).toContain(
    '/x/a/src/routes.tsx',
  );
  expect(readFileSync(join(hashDir, 'vite.config.ts'), 'utf8')).toContain('vite-config.ts');
});

test('gallery route is only generated when requested (dev)', () => {
  const without = generateApp(root, []);
  expect(readFileSync(join(without, 'app/routes.ts'), 'utf8')).not.toContain('gallery');
  const withGallery = generateApp(root, [], { gallery: true });
  expect(readFileSync(join(withGallery, 'app/routes.ts'), 'utf8')).toContain('gallery/*');
});
