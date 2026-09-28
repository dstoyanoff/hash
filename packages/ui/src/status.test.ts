import type { EntityRef, EntityState } from '@hash/core';
import { expect, test } from 'vitest';
import { entityStatus, friendlyName, numberAttr } from './status.ts';

const state = (value: string, attributes = {}): EntityState => ({
  ref: 'ha:x.y' as EntityRef,
  state: value,
  attributes,
});

test('maps entity state to a uniform status', () => {
  expect(entityStatus(undefined)).toBe('loading');
  expect(entityStatus(null)).toBe('missing');
  expect(entityStatus(state('unavailable'))).toBe('unavailable');
  expect(entityStatus(state('unknown'))).toBe('unknown');
  expect(entityStatus(state('on'))).toBe('ready');
});

test('attribute helpers', () => {
  expect(friendlyName(state('on', { friendly_name: 'Lamp' }), 'x')).toBe('Lamp');
  expect(friendlyName(null, 'fallback')).toBe('fallback');
  expect(numberAttr(state('on', { brightness: 5 }), 'brightness')).toBe(5);
  expect(numberAttr(state('on', { brightness: '5' }), 'brightness')).toBeUndefined();
});
