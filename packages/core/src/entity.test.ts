import { describe, expect, test } from 'vitest';
import {
  entityDomain,
  formatEntityRef,
  isUnavailable,
  isUnknown,
  parseEntityRef,
} from './entity.ts';

describe('entity refs', () => {
  test('parses and formats', () => {
    expect(parseEntityRef('ha:light.kitchen_lamp')).toEqual({
      integration: 'ha',
      id: 'light.kitchen_lamp',
    });
    expect(formatEntityRef('ma', 'player.living_room')).toBe('ma:player.living_room');
  });

  test.each(['nope', ':x', 'ha:'])('rejects %s', (ref) => {
    expect(() => parseEntityRef(ref)).toThrow(/Invalid entity ref/);
  });

  test('domain and availability helpers', () => {
    expect(entityDomain('light.kitchen_lamp')).toBe('light');
    const state = { ref: 'ha:sensor.x', state: 'unavailable', attributes: {} } as const;
    expect(isUnavailable(state)).toBe(true);
    expect(isUnavailable(undefined)).toBe(true);
    expect(isUnknown({ ...state, state: 'unknown' })).toBe(true);
    expect(isUnavailable({ ...state, state: 'on' })).toBe(false);
  });
});
