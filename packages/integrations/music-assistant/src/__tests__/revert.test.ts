import { expect, test } from 'vitest';
import { HOLD_MS, onReport, REVERT_WINDOW_MS, UNSTARTED_WINDOW_MS, type Shown } from '../revert.ts';

const report = (title: string, position: number, playback = 'playing', volume = 40) => ({
  playback,
  volume,
  media: { title },
  position,
  duration: 200,
  positionUpdatedAt: `p${position}`,
});

type Report = ReturnType<typeof report>;

/** Feeds reports in turn, each at its time, and returns what was shown for each. */
const run = (steps: [number, Report][], allowBack = false, hold = true) => {
  let state: Shown<Report> | undefined;
  return steps.map(([at, input]) => {
    const started = input.playback === 'playing' && input.position >= 0.05;
    const out = onReport(state, input, at, allowBack, started, hold);
    state = out.state;
    return out.show;
  });
};

const titles = (shown: Report[]) => shown.map((entity) => entity.media.title);

test('a new track that has not started is held: the old one stays on show, with its own time, until it does', () => {
  const shown = run([
    [0, report('A', 6)],
    // Next: the new track is announced at 0, and the old one goes on playing.
    [10_000, report('B', 0)],
    // The player says so, with its own position, and flickers.
    [24_000, report('A', 19)],
    [24_100, report('B', 0, 'idle')],
    // Then the new one really starts.
    [25_000, report('B', 0.5)],
  ]);

  expect(titles(shown)).toEqual(['A', 'A', 'A', 'A', 'B']);
  // The old track's time is the one it was shown at, which the clock goes on from.
  expect(shown.slice(1, 4).map((entity) => entity.positionUpdatedAt)).toEqual(['p6', 'p6', 'p6']);
  // A dip to idle while it is held does not show either.
  expect(shown[3]!.playback).toBe('playing');
  expect(shown[4]!.position).toBe(0.5);
});

test('everything else about the player is believed while a track is held', () => {
  const shown = run([
    [0, report('A', 6)],
    [10_000, report('B', 0, 'playing', 70)],
  ]);

  expect(shown[1]).toMatchObject({ media: { title: 'A' }, volume: 70 });
});

test('a new track that never starts is shown as it is after the hold', () => {
  const shown = run([
    [0, report('A', 6)],
    [10_000, report('B', 0)],
    [10_000 + HOLD_MS + 1, report('B', 0)],
  ]);

  expect(titles(shown)).toEqual(['A', 'A', 'B']);
});

test('once it has started, a report of the track just left is a flicker, for a while', () => {
  const shown = run([
    [0, report('A', 6)],
    [10_000, report('B', 0)],
    [11_000, report('B', 0.5)],
    [13_000, report('A', 13)],
    [11_000 + REVERT_WINDOW_MS + 1, report('A', 2)],
  ]);

  expect(titles(shown)).toEqual(['A', 'A', 'B', 'B', 'A']);
});

test('a track that is new while nothing plays, or the first one seen, is shown straight away', () => {
  const shown = run([
    [0, report('A', 6, 'paused')],
    [10_000, report('B', 0, 'paused')],
    [11_000, report('C', 0, 'paused')],
  ]);

  expect(titles(shown)).toEqual(['A', 'B', 'C']);
});

test('Previous, when asked, goes back to the track just left', () => {
  const shown = run(
    [
      [0, report('A', 6)],
      [10_000, report('B', 0.5)],
      [11_000, report('A', 0.5)],
    ],
    true,
  );

  expect(titles(shown)).toEqual(['A', 'B', 'A']);
});

test('without a hold (the queue’s own track), the old one is not believed until the new has started, however long', () => {
  const shown = run(
    [
      [0, report('A', 6)],
      [10_000, report('B', 0)],
      [50_000, report('A', 40)],
      [51_000, report('B', 0.5)],
      [80_000, report('A', 1)],
      [10_000 + UNSTARTED_WINDOW_MS + 1, report('A', 1)],
    ],
    false,
    false,
  );

  expect(titles(shown)).toEqual(['A', 'B', 'B', 'B', 'A', 'A']);
});
