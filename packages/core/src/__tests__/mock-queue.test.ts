import { describe, expect, test } from 'vitest';
import { UnknownEntityError } from '../entity.ts';
import { mockQueue } from '../mock-queue.ts';
import { mockLibrary, mockLight, mockMediaPlayer, MockIntegration } from '../mock.ts';

const library = mockLibrary();
const player = (queue: boolean) =>
  ({
    ...mockMediaPlayer({ name: 'Room', capabilities: { queue } }),
    ref: 'ha:room',
  }) as never;

describe('mockQueue', () => {
  test('is the library’s tracks round and round, with the third playing and two before it', () => {
    const { items, total, offset } = mockQueue(player(true), library, {});
    expect(total).toBe(24);
    expect(offset).toBe(0);
    expect(items).toHaveLength(24);
    expect(items.map((item) => item.current === true)).toEqual(
      items.map((_, index) => index === 2),
    );

    // With nothing playing, it starts at the first track of the library, two before the current one.
    expect(items[2]!.title).toBe('Blank Space');
    expect(new Set(items.map((item) => item.id)).size).toBe(24);
  });

  test('the limit keeps the start of it', () => {
    expect(mockQueue(player(true), library, { limit: 5 }).items).toHaveLength(5);
  });

  test('has nothing for a player without a queue, for anything else, or with no tracks', () => {
    expect(mockQueue(player(false), library, {}).items).toEqual([]);
    expect(mockQueue(undefined, library, {}).total).toBe(0);
    expect(mockQueue(player(true), {}, {}).items).toEqual([]);
  });
});

describe('mockQueue and what plays', () => {
  test('the track the player says is playing is the current one', () => {
    const playing = {
      ...mockMediaPlayer({
        name: 'Room',
        media: { title: 'Kids' },
        capabilities: { queue: true },
      }),
      ref: 'ha:room',
    } as never;

    const { items } = mockQueue(playing, library, {});
    expect(items.find((item) => item.current)!.title).toBe('Kids');
    expect(items[0]!.title).not.toBe('Kids');
  });
});

describe('MockIntegration.queue', () => {
  test('answers for a player with a queue, and rejects an unknown entity', async () => {
    const ha = new MockIntegration({
      library,
      entities: {
        room: mockMediaPlayer({ name: 'Room', capabilities: { queue: true } }),
        lamp: mockLight({ name: 'Lamp' }),
      },
    });

    expect((await ha.queue('room', { limit: 4 })).items).toHaveLength(4);
    expect((await ha.queue('lamp', {})).items).toEqual([]);
    await expect(ha.queue('missing', {})).rejects.toBeInstanceOf(UnknownEntityError);
  });
});
