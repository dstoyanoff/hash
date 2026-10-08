import { expect, test } from 'vitest';
import { resolveConfig } from '../config.ts';
import { createViteConfig, debugRequested } from '../vite.ts';

test('HASHSOME_DEBUG asks for the debug menu with 1 or true, in any case, and nothing else does', () => {
  expect(debugRequested({ HASHSOME_DEBUG: '1' })).toBe(true);
  expect(debugRequested({ HASHSOME_DEBUG: 'true' })).toBe(true);
  expect(debugRequested({ HASHSOME_DEBUG: 'TRUE' })).toBe(true);
  expect(debugRequested({ HASHSOME_DEBUG: '0' })).toBe(false);
  expect(debugRequested({ HASHSOME_DEBUG: 'false' })).toBe(false);
  expect(debugRequested({ HASHSOME_DEBUG: '' })).toBe(false);
  expect(debugRequested({})).toBe(false);
});

test('the Vite config hands the answer to the code it builds, as a constant', () => {
  const config = resolveConfig('/project', { integrations: [] });
  const defined = createViteConfig(config).define;
  expect(defined).toHaveProperty('HASHSOME_DEBUG_ON');
  expect(['true', 'false']).toContain(String(defined?.['HASHSOME_DEBUG_ON']));
});
