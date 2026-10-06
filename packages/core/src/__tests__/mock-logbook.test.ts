import { describe, expect, test } from 'vitest';
import { UnknownEntityError } from '../entity.ts';
import { mockLogbook } from '../mock-logbook.ts';
import { mockLight, mockSensor, MockIntegration } from '../mock.ts';

const NOW = Date.UTC(2026, 9, 6, 12, 0, 0);
const lamp = { ...mockLight({ name: 'Lamp', on: true }), ref: 'ha:lamp' } as never;

describe('mockLogbook', () => {
  test('a light has newest-first activity, going back through the days, up to the limit', () => {
    const { entries } = mockLogbook('lamp', lamp, { limit: 6 }, NOW);
    expect(entries).toHaveLength(6);
    expect(entries[0]!.timestamp > entries[1]!.timestamp).toBe(true);
    expect(new Date(entries[0]!.timestamp).getTime()).toBeLessThan(NOW);
    expect(mockLogbook('lamp', lamp, {}, NOW).entries).toHaveLength(20);
  });

  test('turns on and off in turn, caused by people and automations, sometimes by nothing', () => {
    const { entries } = mockLogbook('lamp', lamp, { limit: 20 }, NOW);
    expect(entries.map((entry) => entry.message)).toEqual(
      expect.arrayContaining(['turned on', 'turned off', 'became unavailable']),
    );

    expect(entries.some((entry) => entry.actorKind === 'automation')).toBe(true);
    expect(entries.some((entry) => entry.actor === 'Dan')).toBe(true);
    expect(entries.some((entry) => entry.actor === undefined)).toBe(true);
  });

  test('is the same every time for the same entity and moment', () => {
    expect(mockLogbook('lamp', lamp, { limit: 8 }, NOW)).toEqual(
      mockLogbook('lamp', lamp, { limit: 8 }, NOW),
    );
  });

  test('has nothing for what does not switch', () => {
    expect(mockLogbook('t', undefined, {}, NOW).entries).toEqual([]);
    const sensor = { ...mockSensor({ value: '1' }), ref: 'ha:t' } as never;
    expect(mockLogbook('t', sensor, {}, NOW).entries).toEqual([]);
  });
});

describe('MockIntegration.logbook', () => {
  test('answers for a light, and rejects an unknown entity', async () => {
    const ha = new MockIntegration({ entities: { lamp: mockLight({ name: 'Lamp' }) } });
    expect((await ha.logbook('lamp', { limit: 3 })).entries).toHaveLength(3);
    await expect(ha.logbook('missing', {})).rejects.toBeInstanceOf(UnknownEntityError);
  });
});
