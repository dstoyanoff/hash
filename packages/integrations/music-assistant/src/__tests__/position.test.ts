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

describe('playing started from a stop that was not seen', () => {
  test('a resume spot cleared as playback starts is not shown', () => {
    // Connected while stopped, with Music Assistant ready to resume at 30.
    let position = queue({}, 18, 'idle', 1, { resume: 30 });
    expect(positionOf(position, 'idle')).toBe(30);

    // Pressing play: it clears the resume spot before the player says it is playing.
    position = queue(position, 0, 'idle', 70, { resume: 0 });
    expect(positionOf(position, 'idle')).toBe(30);
  });

  test('and neither is the stream starting over, nor a start a little before the spot', () => {
    let position = queue({}, 18, 'idle', 1, { resume: 30 });
    position = queue(position, 0, 'idle', 70, { resume: 0 });
    position = onPlayback(position, 'idle', 'playing', 70.3);
    expect(positionOf(position, 'playing')).toBe(30);

    position = queue(position, 15, 'playing', 70.4, { resume: 0 });
    expect(positionOf(position, 'playing')).toBe(30);
    position = queue(position, 29.3, 'playing', 71);
    expect(positionOf(position, 'playing')).toBe(30);
    position = queue(position, 31, 'playing', 72);
    expect(positionOf(position, 'playing')).toBe(31);
  });

  test('the resume spot never goes down while stopped, but a stop at an earlier spot starts afresh', () => {
    let position = queue({}, 0, 'idle', 1, { resume: 30 });
    position = queue(position, 0, 'idle', 2, { resume: 5 });
    expect(positionOf(position, 'idle')).toBe(30);

    // Played from there and stopped earlier in the track: where it was held is what counts.
    position = onPlayback(position, 'idle', 'playing', 3);
    position = queue(position, 30, 'playing', 3.2);
    position = queue(position, 4, 'playing', 20);
    position = onPlayback(position, 'playing', 'idle', 26);
    expect(positionOf(position, 'idle')).toBeCloseTo(10);
  });
});
