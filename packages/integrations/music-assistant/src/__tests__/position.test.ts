import { describe, expect, test } from 'vitest';
import { onPlayback, onQueue, positionOf, type Position } from '../position.ts';

/** A queue message for a track, as Music Assistant sends them. */
const queue = (
  position: Position,
  at: number,
  playback: string,
  message: { elapsed?: number; resume?: number; item?: string },
) => onQueue(position, { item: 'a', ...message }, playback, at);

describe('playing', () => {
  test('follows the counter the queue reports, as of when it was received', () => {
    const position = queue({}, 100, 'playing', { elapsed: 12 });
    expect(position).toMatchObject({ elapsed: 12, elapsedAt: 100 });
    expect(positionOf(position, 'playing')).toBe(12);
  });

  test('a real pause, that holds the stream, is followed as it is', () => {
    let position = queue({}, 100, 'playing', { elapsed: 40 });
    position = queue(position, 101, 'paused', { elapsed: 41 });
    expect(positionOf(position, 'paused')).toBe(41);
  });
});

describe('a stop', () => {
  test('remembers how far it got from the last position and the time since', () => {
    const stopped = onPlayback(queue({}, 62, 'playing', { elapsed: 0.5 }), 'playing', 'idle', 78.2);
    expect(stopped.held).toBeCloseTo(16.7);
    expect(positionOf(stopped, 'idle')).toBeCloseTo(16.7);
  });

  test('the counter going back to the start, and the old resume spot, do not move it back', () => {
    let position = onPlayback(queue({}, 62, 'playing', { elapsed: 0.5 }), 'playing', 'idle', 78.2);
    position = queue(position, 78.3, 'idle', { elapsed: 3, resume: 16 });
    expect(positionOf(position, 'idle')).toBeCloseTo(16.7);
    position = queue(position, 78.8, 'idle', { elapsed: 3, resume: 0 });
    expect(positionOf(position, 'idle')).toBeCloseTo(16.7);
  });

  test('a resume spot further on than the estimate wins', () => {
    let position = onPlayback(queue({}, 0, 'playing', { elapsed: 10 }), 'playing', 'idle', 5);
    position = queue(position, 6, 'idle', { elapsed: 0, resume: 20 });
    expect(positionOf(position, 'idle')).toBe(20);
  });

  test('with nothing played yet, the queue’s resume spot is the position', () => {
    const position = queue({}, 1, 'idle', { elapsed: 0, resume: 15 });
    expect(positionOf(position, 'idle')).toBe(15);
  });

  test('a stop at an earlier spot than the last is its own', () => {
    let position = queue({}, 1, 'idle', { elapsed: 0, resume: 30 });
    position = onPlayback(position, 'idle', 'playing', 3);
    position = queue(position, 3.2, 'playing', { elapsed: 30 });
    position = queue(position, 20, 'playing', { elapsed: 4 });
    position = onPlayback(position, 'playing', 'idle', 26);
    expect(positionOf(position, 'idle')).toBeCloseTo(10);
  });
});

describe('playing again', () => {
  const stopped = () =>
    onPlayback(queue({}, 62, 'playing', { elapsed: 0.5 }), 'playing', 'idle', 78.2);

  test('is shown from where it was held until the queue says where it starts', () => {
    const resumed = onPlayback(stopped(), 'idle', 'playing', 88);
    expect(positionOf(resumed, 'playing')).toBeCloseTo(16.7);
  });

  test('a start a moment before where it was is not shown as going back', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 88.6, 'playing', { elapsed: 16 });
    expect(positionOf(position, 'playing')).toBeCloseTo(16.7);
    expect(position.held).toBeUndefined();
  });

  test('the queue’s position is the truth, even if far from where it was stopped', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 88.1, 'playing', { elapsed: 0 });
    expect(positionOf(position, 'playing')).toBe(0);
    position = queue(position, 90, 'playing', { elapsed: 2 });
    expect(positionOf(position, 'playing')).toBe(2);
  });

  test('once playing, going back is a seek', () => {
    let position = onPlayback(stopped(), 'idle', 'playing', 88);
    position = queue(position, 88.6, 'playing', { elapsed: 16 });
    position = queue(position, 102, 'playing', { elapsed: 30 });
    position = queue(position, 110, 'playing', { elapsed: 5 });
    expect(positionOf(position, 'playing')).toBe(5);
  });
});

describe('a different track', () => {
  test('forgets where the last one was', () => {
    let position = onPlayback(queue({}, 0, 'playing', { elapsed: 90 }), 'playing', 'idle', 1);
    position = onQueue(position, { item: 'b', elapsed: 0 }, 'idle', 2);
    expect(positionOf(position, 'idle')).toBe(0);
  });

  test('does not take the last track’s resume spot as its own', () => {
    // The next track, as Music Assistant announces it: still carrying the resume spot of the last.
    let position = onPlayback(queue({}, 0, 'playing', { elapsed: 0.8 }), 'playing', 'idle', 13);
    position = queue(position, 13.5, 'idle', { elapsed: 10, resume: 13 });
    position = onQueue(position, { item: 'b', elapsed: 0, resume: 13 }, 'idle', 14);
    expect(positionOf(position, 'idle')).toBe(0);

    // It is not the new track's until Music Assistant says a different number.
    position = onQueue(position, { item: 'b', elapsed: 0, resume: 0 }, 'idle', 17);
    expect(positionOf(position, 'idle')).toBe(0);
    position = onPlayback(position, 'idle', 'playing', 17.5);
    position = onQueue(position, { item: 'b', elapsed: 0 }, 'playing', 17.5);
    expect(positionOf(position, 'playing')).toBe(0);
  });
});

describe('what Music Assistant really sent', () => {
  // The raw events of a recorded session, in order: a start that begins at 0 although a resume spot
  // of 30 was showing, then a pause and a resume at 10, then the next track.
  test('replays without the position ever going behind a pause, and ends where it should', () => {
    let position: Position = {};
    const shown: number[] = [];
    const show = (playback: string) => {
      const spot = positionOf(position, playback);
      if (spot !== undefined) {
        shown.push(spot);
      }
    };

    // Connected while stopped, ready to resume at 30.
    position = queue(position, 2, 'idle', { elapsed: 0, resume: 30 });
    show('idle');
    // Play is pressed: Music Assistant clears the resume spot, and starts the track from 0.
    position = queue(position, 24.06, 'idle', { elapsed: 0, resume: 0 });
    show('idle');
    position = onPlayback(position, 'idle', 'playing', 24.59);
    position = queue(position, 24.59, 'playing', { elapsed: 0, resume: 0 });
    show('playing');
    // The pause 10.6 seconds in, and the resume spot Music Assistant then reports.
    position = onPlayback(position, 'playing', 'idle', 35.18);
    show('idle');
    expect(positionOf(position, 'idle')).toBeCloseTo(10.59, 1);
    position = queue(position, 35.68, 'idle', { elapsed: 0, resume: 10 });
    show('idle');
    // The resume: it copies the spot into the counter, clears the spot, and plays.
    position = queue(position, 36.9, 'idle', { elapsed: 0, resume: 0 });
    position = queue(position, 37, 'idle', { elapsed: 10, resume: 0 });
    show('idle');
    position = onPlayback(position, 'idle', 'playing', 37.38);
    show('playing');
    position = queue(position, 37.38, 'playing', { elapsed: 10, resume: 0 });
    show('playing');

    // Nothing was shown behind the pause (10.6) until playing again, and playing is where it really is.
    // Music Assistant says 10, a moment before the 10.6 it was paused at: not shown as a step back.
    expect(positionOf(position, 'playing')).toBeCloseTo(10.59, 1);
    const afterPause = shown.slice(shown.findIndex((spot) => Math.abs(spot - 10.59) < 0.01));
    expect(afterPause.every((spot) => spot >= 10)).toBe(true);
  });
});

test('a track announced at the start and stopped before it was heard from has played no time', () => {
  // Music Assistant announces the new track at 0 and the player flips to idle and back before it really starts.
  let position = onQueue({}, { item: 'b', elapsed: 0 }, 'playing', 10);
  position = onPlayback(position, 'playing', 'idle', 13.6);
  expect(positionOf(position, 'idle')).toBe(0);
  position = onPlayback(position, 'idle', 'playing', 13.8);
  expect(positionOf(position, 'playing')).toBe(0);

  // Its real start is what the time counts from.
  position = onQueue(position, { item: 'b', elapsed: 0.5 }, 'playing', 14.3);
  expect(positionOf(position, 'playing')).toBe(0.5);
});

test('a track that has been heard from keeps the time it played through a stop', () => {
  let position = onQueue({}, { item: 'b', elapsed: 0 }, 'playing', 10);
  position = onQueue(position, { item: 'b', elapsed: 0.5 }, 'playing', 10.5);
  position = onPlayback(position, 'playing', 'idle', 13.5);
  expect(positionOf(position, 'idle')).toBeCloseTo(3.5, 1);
});
