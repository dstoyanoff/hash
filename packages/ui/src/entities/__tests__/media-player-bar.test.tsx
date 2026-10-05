import { mockMediaPlayer } from '@hashsome/core';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { MediaPlayerBar } from '../media-player-bar.tsx';

const player = (playback: 'playing' | 'paused' = 'playing') => ({
  room: mockMediaPlayer({
    name: 'Room',
    playback,
    media: { title: 'Blank Space', artist: 'More More' },
    volume: 0.4,
  }),
});

test('shows track info and toggles play/pause', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  expect(screen.getByText('Blank Space')).toBeTruthy();
  expect(screen.getByText('More More')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(ha.getEntity('room')).toMatchObject({ playback: 'paused' });
  expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
});

test('skips tracks', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(ha.calls.map((c) => c.command)).toEqual(['next', 'previous']);
});

test('transport order is volume, then previous, play/pause, next (after the artwork, which opens the player)', () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
  expect(names).toEqual(['Open player', 'Volume', 'Previous', 'Pause', 'Next']);
});

function mockWidth(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 0, width: 200, top: 0, height: 28, right: 200, bottom: 28, x: 0, y: 0 }) as DOMRect;
}

test('the volume button opens a volume slider in the bar; the X closes it', () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  expect(screen.queryByRole('slider', { name: 'Volume level' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  const slider = screen.getByRole('slider', { name: 'Volume level' });
  expect(slider.getAttribute('aria-valuenow')).toBe('40');
  expect(screen.queryByText('Blank Space')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close volume' }));
  expect(screen.queryByRole('slider', { name: 'Volume level' })).toBeNull();
  expect(screen.getByText('Blank Space')).toBeTruthy();
});

test('dragging or nudging the slider sets the volume as a fraction and it sticks', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  const slider = screen.getByRole('slider', { name: 'Volume level' });
  mockWidth(slider);
  fireEvent.pointerDown(slider, { clientX: 140, pointerId: 1 });
  fireEvent.pointerUp(slider, { clientX: 140, pointerId: 1 });
  expect(ha.calls.at(-1)).toMatchObject({ command: 'setVolume', args: { volume: 0.7 } });
  expect(screen.getByRole('slider', { name: 'Volume level' }).getAttribute('aria-valuenow')).toBe(
    '70',
  );

  fireEvent.keyDown(screen.getByRole('slider', { name: 'Volume level' }), { key: 'ArrowLeft' });
  expect(ha.getEntity('room')).toMatchObject({ volume: 0.65 });
});

test('the mute button mutes, and moving the slider while muted unmutes', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
  expect(ha.getEntity('room')).toMatchObject({ muted: true });
  expect(screen.getByRole('button', { name: 'Unmute' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Volume level' }), { key: 'ArrowRight' });
  expect(ha.getEntity('room')).toMatchObject({ muted: false });
});

test('unavailable player is disabled', () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, {
    room: mockMediaPlayer({ availability: 'unavailable', playback: 'off' }),
  });

  expect(screen.getByText('Unavailable')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Play' }) as HTMLButtonElement).disabled).toBe(true);
});

test('transport icons are smaller than their circles', () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, {
    room: mockMediaPlayer({ playback: 'playing', media: { title: 'Song' } }),
  });

  const button = screen.getByRole('button', { name: 'Pause' });
  expect(button.style.width).toBe('');
  expect(getComputedStyle(button.querySelector('svg') as SVGElement).width).toBe('18px');
});

test('previous and next confirm the press: dimmed while in flight, then flashed, then back to normal', async () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  const next = screen.getByRole('button', { name: 'Next' });
  expect(next.getAttribute('data-feedback')).toBeNull();
  fireEvent.click(next);
  expect(next.getAttribute('data-feedback')).toBe('pending');
  await waitFor(() => expect(next.getAttribute('data-feedback')).toBe('done'));
  // Only the pressed button reacts.
  expect(screen.getByRole('button', { name: 'Previous' }).getAttribute('data-feedback')).toBeNull();
  await waitFor(() => expect(next.getAttribute('data-feedback')).toBeNull(), { timeout: 2000 });
});

test('the volume slider has an explicit full width, so it cannot collapse to nothing in a row', () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  const slider = screen.getByRole('slider', { name: 'Volume level' });
  expect(getComputedStyle(slider).width).toBe('100%');
});

test('the volume overlay shows the percentage, following the slider as it moves', () => {
  renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  expect(screen.getByText('40%')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Volume level' }), { key: 'ArrowRight' });
  expect(screen.getByText('45%')).toBeTruthy();
});

test('moving the slider to 0 mutes; unmuting from zero lands at 15%, from any other level restores it', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  const slider = () => screen.getByRole('slider', { name: 'Volume level' });
  const muted = () => (ha.getEntity('room') as { muted?: boolean } | undefined)?.muted;
  // 40 → 0 in steps of 5.
  for (let i = 0; i < 8; i++) {
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' });
  }

  expect(muted()).toBe(true);
  expect(ha.getEntity('room')).toMatchObject({ volume: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
  expect(muted()).toBe(false);
  expect(ha.getEntity('room')).toMatchObject({ volume: 0.15 });
  expect(screen.getByText('15%')).toBeTruthy();

  // Muting at a normal level and unmuting keeps that level.
  fireEvent.keyDown(slider(), { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
  fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
  expect(ha.getEntity('room')).toMatchObject({ volume: 0.2 });
});

test('a browse button appears only with `browse` content, after the track info, and opens it in the drawer', () => {
  const { unmount } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  expect(screen.queryByRole('button', { name: 'Browse media' })).toBeNull();
  unmount();
  renderWithMock(
    <MediaPlayerBar entity="ha:room" browse={<span>BROWSER CONTENT</span>} />,
    player(),
  );

  const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
  // The artwork is a button too; volume comes first so its overlay opens right next to the track info.
  expect(names).toEqual(['Open player', 'Volume', 'Browse media', 'Previous', 'Pause', 'Next']);

  expect(screen.queryByText('BROWSER CONTENT')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Browse media' }));
  expect(screen.getByText('BROWSER CONTENT')).toBeTruthy();
});

test('clicking the artwork opens the drawer: the player, and the browser below it when there is one', () => {
  const { unmount } = renderWithMock(<MediaPlayerBar entity="ha:room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Open player' }));
  // The drawer shows the player laid out like the vertical one, with no browser to add.
  expect(screen.getAllByRole('heading', { name: 'Blank Space' })).toHaveLength(1);
  unmount();

  renderWithMock(
    <MediaPlayerBar entity="ha:room" browse={<span>BROWSER CONTENT</span>} />,
    player(),
  );

  fireEvent.click(screen.getByRole('button', { name: 'Open player' }));
  expect(screen.getByText('BROWSER CONTENT')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Blank Space' })).toBeTruthy();
});
