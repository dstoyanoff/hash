import { expect, test } from 'vitest';
import { generateEntityTypes } from './codegen.ts';

test('generates sorted, de-duplicated module augmentation', () => {
  const out = generateEntityTypes(['ha:light.b', 'ha:light.a', 'ha:light.b']);
  expect(out).toContain("declare module '@hash/core'");
  expect(out.indexOf('ha:light.a')).toBeLessThan(out.indexOf('ha:light.b'));
  expect(out.match(/ha:light\.b/g)).toHaveLength(1);
});
