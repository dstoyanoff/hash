import { expect, test } from 'vitest';
import { shouldBuild } from '../start.ts';

test('start builds first, unless it is told to serve what is already built', () => {
  expect(shouldBuild([])).toBe(true);
  expect(shouldBuild(['--something-else'])).toBe(true);
  expect(shouldBuild(['--no-build'])).toBe(false);
});
