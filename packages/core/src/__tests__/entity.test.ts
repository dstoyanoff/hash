import { describe, expect, test } from 'vitest';
import { formatEntityRef, parseEntityRef, UnknownEntityError } from '../entity.ts';

describe('entity refs', () => {
  test('parses and formats', () => {
    expect(parseEntityRef('ha:light.kitchen_lamp')).toEqual({
      integration: 'ha',
      id: 'light.kitchen_lamp',
    });

    expect(formatEntityRef('ma', 'player.living_room')).toBe('ma:player.living_room');
  });

  test('an id may itself contain colons and dots', () => {
    expect(parseEntityRef('ma:aa:bb.cc')).toEqual({ integration: 'ma', id: 'aa:bb.cc' });
  });

  test.each(['nope', ':x', 'ha:'])('rejects %s', (ref) => {
    expect(() => parseEntityRef(ref)).toThrow(/Invalid entity ref/);
  });

  test('UnknownEntityError names the full ref', () => {
    const error = new UnknownEntityError('ha', 'light.nope');
    expect(error.message).toBe('Unknown entity "ha:light.nope"');
    expect(error).toBeInstanceOf(Error);
  });
});
