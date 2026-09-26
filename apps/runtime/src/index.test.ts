import { expect, test } from 'vitest';
import { name } from './index';

test('exports package name', () => {
  expect(name).toBe('@hash/runtime');
});
