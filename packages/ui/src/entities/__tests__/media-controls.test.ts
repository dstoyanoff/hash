import type { MediaPlayerEntity, QueueResult } from '@hashsome/core';
import { expect, test } from 'vitest';
import { transportAvailability } from '../media-controls.ts';

const item = (id: string, current = false) => ({ id, title: id, ...(current ? { current } : {}) });
const queue = (
  items: ReturnType<typeof item>[],
  total = items.length,
  offset = 0,
): QueueResult => ({
  items,
  total,
  offset,
});

const player = (media?: { title: string }, playback = 'paused') =>
  ({
    ref: 'ha:room',
    kind: 'mediaPlayer',
    playback,
    ...(media ? { media } : {}),
  }) as unknown as MediaPlayerEntity;

test('Next is off on the last track and on elsewhere', () => {
  expect(transportAvailability(queue([item('a'), item('b', true)]), player(), 0).next).toBe(false);
  expect(transportAvailability(queue([item('a', true), item('b')]), player(), 0).next).toBe(true);
  // The window can end before the queue does.
  expect(transportAvailability(queue([item('a', true)], 40), player(), 0).next).toBe(true);
});

test('Previous is off on the first track, unless it is far enough in to restart', () => {
  const first = queue([item('a', true), item('b')]);
  expect(transportAvailability(first, player(), 1).previous).toBe(false);
  expect(transportAvailability(first, player(), 30).previous).toBe(true);
  expect(transportAvailability(queue([item('a'), item('b', true)]), player(), 0).previous).toBe(
    true,
  );

  // The first track of a window that starts later in the queue is not the first of the queue.
  expect(transportAvailability(queue([item('a', true)], 9, 4), player(), 0).previous).toBe(true);
});

test('Play is off only with nothing queued, nothing loaded and nothing playing', () => {
  expect(transportAvailability(queue([]), player(), undefined).play).toBe(false);
  expect(transportAvailability(queue([]), player({ title: 'x' }), undefined).play).toBe(true);
  expect(transportAvailability(queue([item('a', true)]), player(), undefined).play).toBe(true);
});

test('nothing is held back while the queue is unknown', () => {
  expect(transportAvailability(undefined, player(), undefined)).toEqual({
    next: true,
    previous: true,
    play: true,
  });
});
