import { describe, expect, test } from 'vitest';
import { onPlayback, onQueue, positionOf, type Position } from '../position.ts';

const queue = (position: Position, elapsed: number, playback: string, now: number, extra = {}) =>
  onQueue(position, { item: 'a', elapsed, ...extra }, playback, now);

describe('playing', () => {
  test('follows the counter the queue reports, as of when it was received', () => {
    const position = queue({}, 12, 'playing', 100);
    expect(position).toMatchObject({ elapsed: 12, elapsedAt: 100 });
    expect(positionOf(position, 'playing')).toBe(12);
  });

  test('a real pause, that holds the stream, is followed as it is', () => {
    const position = queue(queue({}, 40, 'playing', 100), 41, 'paused', 101);
    expect(positionOf(position, 'paused')).toBe(41);
  });
});

describe('a stop', () => {
  test('remembers how far it got from the last position and the time since', () => {
    const playing = queue({}, 0.5, 'playing', 62);
    const stopped = onPlayback(playing, 'playing', 'idle', 78.2);
    expect(stopped.held).toBeCloseTo(16.7);
    expect(positionOf(stopped, 'idle')).toBeCloseTo(16.7);
  });

  test('the counter going back to the start, and old resume spots, do not move it back', () => {
    let position = onPlayback(queue({}, 0.5, 'playing', 62), 'playing', 'idle', 78.2);
    position = queue(position, 3, 'idle', 78.3, { resume: 0.5 });
    expect(positionOf(position, 'idle')).toBeCloseTo(16.7);
    position = queue(position, 3, 'idle', 78.8, { resume: 16 });
    expect(positionOf(position, 'idle')).toBeCloseTo(16.7);
  });

  test('a resume spot further on than the estimate wins', () => {
    let position = onPlayback(queue({}, 10, 'playing', 0), 'playing', 'idle', 5);
    position = queue(position, 0, 'idle', 6, { resume: 20 });
    expect(positionOf(position, 'idle')).toBe(20);
  });

  test('with nothing played yet, the queue’s resume spot is the position', () => {
    const position = queue({}, 0, 'idle', 1, { resume: 15 });
    expect(positionOf(position, 'idle')).toBe(15);
  });
});

describe('resuming', () => {
  const stopped = () => onPlayback(queue({}, 0.5, 'playing', 62), 'playing', 'idle', 78.2);

  test('starts from where it was, at once', () => {
    const resumed = onPlayback(stopped(), 'idle', 'playing', 88);
    expect(resumed).toMatchObject({ elapsedAt: 88 });
    expect(positionOf(resumed, 'playing')).toBeCloseTo(16.7);
  });

  test('the stream starting over from the beginning is not shown', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 0.5, 'playing', 88.1);
    expect(positionOf(position, 'playing')).toBeCloseTo(16.7);
  });

  test('a start a moment before where it was is not shown as going back', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 16, 'playing', 88.6);
    expect(positionOf(position, 'playing')).toBeCloseTo(16.7);
    expect(position.held).toBeUndefined();
  });

  test('once settled the queue is followed, and going back later is a seek', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 16, 'playing', 88.6);
    position = queue(position, 30, 'playing', 102);
    expect(positionOf(position, 'playing')).toBe(30);
    position = queue(position, 5, 'playing', 110);
    expect(positionOf(position, 'playing')).toBe(5);
  });

  test('a position far behind, long after resuming, is a seek and not the stream starting over', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 2, 'playing', 95);
    expect(positionOf(position, 'playing')).toBe(2);
  });
});

describe('a different track', () => {
  test('forgets where the last one was', () => {
    let position = onPlayback(queue({}, 90, 'playing', 0), 'playing', 'idle', 1);
    position = onQueue(position, { item: 'b', elapsed: 0 }, 'idle', 2);
    expect(positionOf(position, 'idle')).toBe(0);
  });
});
