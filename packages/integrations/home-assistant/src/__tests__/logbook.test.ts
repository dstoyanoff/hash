import { describe, expect, test } from 'vitest';
import { messageFor, toLogbookEntries, type LogbookLookup } from '../logbook.ts';

const lookup: LogbookLookup = {
  personByUserId: new Map([['u-danny', 'Danny']]),
  nameOf: (id) => ({ 'automation.sleep': 'Sleep', 'light.corner': 'Corner light' })[id],
};

describe('messageFor', () => {
  test('says what the state means in words', () => {
    expect(messageFor('on')).toBe('turned on');
    expect(messageFor('off')).toBe('turned off');
    expect(messageFor('unavailable')).toBe('became unavailable');
    expect(messageFor('unknown')).toBe('became unknown');
    expect(messageFor('heat')).toBe('changed to heat');
    expect(messageFor(undefined)).toBe('changed');
  });
});

describe('toLogbookEntries', () => {
  test('a person who called a service is named, from their user id', () => {
    expect(
      toLogbookEntries(
        [
          {
            when: 1_791_228_851.98,
            entity_id: 'light.wall',
            state: 'off',
            context_user_id: 'u-danny',
            context_domain: 'light',
            context_event_type: 'call_service',
          },
        ],
        lookup,
        20,
      ),
    ).toEqual([
      {
        id: 'light.wall@1791228851.98',
        message: 'turned off',
        timestamp: new Date(1_791_228_851_980).toISOString(),
        actor: 'Danny',
        actorKind: 'person',
        change: 'state',
      },
    ]);
  });

  test('an automation is the cause even when someone ran it, named by its own name', () => {
    const [entry] = toLogbookEntries(
      [
        {
          when: 100,
          entity_id: 'light.lamp',
          state: 'off',
          context_event_type: 'automation_triggered',
          context_domain: 'automation',
          context_name: 'sleep',
          context_entity_id: 'automation.sleep',
          context_user_id: 'u-danny',
        },
      ],
      lookup,
      20,
    );

    expect(entry).toMatchObject({ actor: 'sleep', actorKind: 'automation' });
  });

  test('a change driven by another entity names it; one driven by itself or by nothing has no actor', () => {
    const entries = toLogbookEntries(
      [
        { when: 300, entity_id: 'light.wall', state: 'off', context_entity_id: 'light.corner' },
        { when: 200, entity_id: 'light.wall', state: 'unavailable' },
        { when: 100, entity_id: 'light.wall', state: 'on', context_entity_id: 'light.wall' },
        { when: 50, entity_id: 'light.wall', state: 'on', context_user_id: 'u-stranger' },
      ],
      lookup,
      20,
    );

    expect(entries[0]).toMatchObject({ actor: 'Corner light', actorKind: 'automation' });
    expect(entries[1]).not.toHaveProperty('actor');
    expect(entries[2]).not.toHaveProperty('actor');
    expect(entries[3]).not.toHaveProperty('actor');
  });

  test('a change with no cause after the device was unreachable is it coming back, not someone turning it on', () => {
    const entries = toLogbookEntries(
      [
        { when: 100, entity_id: 'light.lamp', state: 'on', context_user_id: 'u-danny' },
        { when: 200, entity_id: 'light.lamp', state: 'unavailable' },
        { when: 300, entity_id: 'light.lamp', state: 'off' },
        { when: 400, entity_id: 'light.lamp', state: 'on' },
        { when: 500, entity_id: 'light.lamp', state: 'unknown' },
        { when: 600, entity_id: 'light.lamp', state: 'on', context_user_id: 'u-danny' },
      ],
      lookup,
      20,
    );

    // Newest first.
    expect(entries.map((entry) => entry.message)).toEqual([
      'turned on',
      'became unknown',
      'turned on',
      'came back online, off',
      'became unavailable',
      'turned on',
    ]);

    // Someone who did turn it on after an outage is still the cause; an unrelated light's history is its own.
    expect(entries[0]).toMatchObject({ actor: 'Danny', change: 'state' });
    expect(entries[3]).toMatchObject({ change: 'availability' });
    expect(entries[2]).toMatchObject({ change: 'state' });
    expect(
      toLogbookEntries(
        [
          { when: 1, entity_id: 'light.a', state: 'unavailable' },
          { when: 2, entity_id: 'light.b', state: 'on' },
        ],
        lookup,
        5,
      )[0]!.message,
    ).toBe('turned on');
  });

  test('marks a change of state, and a device coming or going, so a row can say more than its words', () => {
    const [off, lost] = toLogbookEntries(
      [
        { when: 2, entity_id: 'light.a', state: 'off' },
        { when: 1, entity_id: 'light.a', state: 'unavailable' },
      ],
      lookup,
      5,
    );

    expect(off).toMatchObject({ message: 'came back online, off', change: 'availability' });
    expect(lost).toMatchObject({ message: 'became unavailable', change: 'availability' });
    expect(
      toLogbookEntries([{ when: 3, entity_id: 'light.a', state: 'heat' }], lookup, 5)[0],
    ).toMatchObject({ change: 'state' });
  });

  test('is newest first, limited, and drops an event without a time', () => {
    const entries = toLogbookEntries(
      [
        { when: 100, entity_id: 'a', state: 'on' },
        { entity_id: 'a', state: 'off' },
        { when: 300, entity_id: 'a', state: 'off' },
        { when: 200, entity_id: 'a', state: 'on' },
      ],
      lookup,
      2,
    );

    expect(entries.map((entry) => entry.message)).toEqual(['turned off', 'turned on']);
    expect(entries[0]!.timestamp > entries[1]!.timestamp).toBe(true);
  });
});
