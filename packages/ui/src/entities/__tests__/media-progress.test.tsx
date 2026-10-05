import { mockMediaPlayer, type MediaPlayerEntity } from '@hash/core';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { formatDuration, useMediaPosition } from '../media-progress.ts';

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-06-01T12:00:00Z') }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const player = (init: Parameters<typeof mockMediaPlayer>[0]) =>
  ({ ...mockMediaPlayer(init), ref: 'ha:x' }) as MediaPlayerEntity;

function Position({ entity }: { entity: MediaPlayerEntity }) {
  return <output>{String(useMediaPosition(entity))}</output>;
}

test('durations read m:ss, and h:mm:ss from an hour', () => {
  expect(formatDuration(0)).toBe('0:00');
  expect(formatDuration(64.9)).toBe('1:04');
  expect(formatDuration(3_725)).toBe('1:02:05');
  expect(formatDuration(-3)).toBe('0:00');
});

test('a playing player advances from its reported position on its own clock', () => {
  const playing = player({
    playback: 'playing',
    position: 10,
    duration: 100,
    positionUpdatedAt: '2026-06-01T12:00:00Z',
  });

  render(<Position entity={playing} />);
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('10');
  act(() => vi.advanceTimersByTime(5000));
  expect(Number(screen.getByRole('status', { hidden: true }).textContent)).toBeCloseTo(15, 0);
});

test('a paused player stays where it was, a long-playing one stops at the end, and none reports nothing', () => {
  const paused = player({
    playback: 'paused',
    position: 10,
    duration: 100,
    positionUpdatedAt: '2026-06-01T11:00:00Z',
  });

  const { unmount } = render(<Position entity={paused} />);
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('10');
  unmount();

  const stale = player({
    playback: 'playing',
    position: 10,
    duration: 100,
    positionUpdatedAt: '2026-06-01T11:00:00Z',
  });

  const second = render(<Position entity={stale} />);
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('100');
  second.unmount();

  render(<Position entity={player({ playback: 'playing' })} />);
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('undefined');
});
