import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { discoverDashboards } from './discovery.ts';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hash-discovery-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function dashboard(id: string, files = ['dashboard.ts', 'routes.tsx']) {
  mkdirSync(join(dir, id, 'src'), { recursive: true });
  for (const file of files) writeFileSync(join(dir, id, 'src', file), '');
}

test('finds dashboards sorted by id and ignores non-dashboard folders', () => {
  dashboard('bathroom');
  dashboard('attic');
  mkdirSync(join(dir, 'shared'));
  mkdirSync(join(dir, '.hidden'));
  expect(discoverDashboards(dir).map((d) => d.id)).toEqual(['attic', 'bathroom']);
});

test('returns empty for a missing directory', () => {
  expect(discoverDashboards(join(dir, 'nope'))).toEqual([]);
});

test('rejects invalid ids and missing routes', () => {
  dashboard('Bad_Id');
  expect(() => discoverDashboards(dir)).toThrow(/Invalid dashboard folder/);
  rmSync(join(dir, 'Bad_Id'), { recursive: true });
  dashboard('kitchen', ['dashboard.ts']);
  expect(() => discoverDashboards(dir)).toThrow(/missing src\/routes\.tsx/);
});
