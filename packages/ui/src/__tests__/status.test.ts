import { mockSensor, type Entity } from '@hash/core';
import { expect, test } from 'vitest';
import { entityStatus } from '../status.ts';

const entity = (init: Parameters<typeof mockSensor>[0]) =>
  ({ ...mockSensor(init), ref: 'ha:x' }) as Entity;

test('maps an entity (or its absence) to a uniform status', () => {
  expect(entityStatus(undefined)).toBe('loading');
  expect(entityStatus(null)).toBe('missing');
  expect(entityStatus(entity({ value: '1', availability: 'unavailable' }))).toBe('unavailable');
  expect(entityStatus(entity({ value: '1', availability: 'unknown' }))).toBe('unknown');
  expect(entityStatus(entity({ value: '1' }))).toBe('ready');
});
