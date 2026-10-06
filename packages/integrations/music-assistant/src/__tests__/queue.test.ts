import { describe, expect, test } from 'vitest';
import { toQueueItems } from '../queue.ts';

describe('toQueueItems', () => {
  test('uses the track’s own title and all its artists, and the picture a browser can open', () => {
    expect(
      toQueueItems(
        [
          {
            queue_item_id: 'a',
            name: 'Pascal Letoublon/Leony - Friendships (Lost My Love)',
            duration: 182,
            image: { path: 'https://cdn.example/a.jpg', remotely_accessible: true },
            media_item: {
              name: 'Friendships (Lost My Love)',
              artists: [{ name: 'Pascal Letoublon' }, { name: 'Leony' }],
              album: { name: 'Friendships' },
            },
          },
        ],
        undefined,
      ),
    ).toEqual([
      {
        id: 'a',
        title: 'Friendships (Lost My Love)',
        artist: 'Pascal Letoublon, Leony',
        album: 'Friendships',
        artworkUrl: 'https://cdn.example/a.jpg',
        duration: 182,
      },
    ]);
  });

  test('falls back to the queue’s own label, marks the current item, and drops one with no id', () => {
    const items = toQueueItems(
      [
        { queue_item_id: 'a', name: 'Artist - Song' },
        {
          queue_item_id: 'b',
          name: 'Other',
          image: { path: '/private/img', remotely_accessible: false },
        },
        { name: 'no id' },
      ],
      'b',
    );

    expect(items).toEqual([
      { id: 'a', title: 'Artist - Song' },
      { id: 'b', title: 'Other', current: true },
    ]);
  });
});
