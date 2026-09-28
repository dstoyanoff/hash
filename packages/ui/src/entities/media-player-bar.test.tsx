import { fireEvent, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../test-utils.tsx';
import { MediaPlayerBar } from './media-player-bar.tsx';

const player = (state = 'playing') => ({
  'media_player.room': {
    state,
    attributes: { media_title: 'Blank Space', media_artist: 'More More', volume_level: 0.4 },
  },
});

test('shows track info and toggles play/pause', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:media_player.room" />, player());
  expect(screen.getByText('Blank Space')).toBeTruthy();
  expect(screen.getByText('More More')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(ha.getState('media_player.room')?.state).toBe('paused');
  expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
});

test('skips tracks', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:media_player.room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(ha.calls.map((c) => c.service)).toEqual(['media_next_track', 'media_previous_track']);
});

test('volume slider sets the level as a fraction', () => {
  const { ha } = renderWithMock(<MediaPlayerBar entity="ha:media_player.room" />, player());
  fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
  fireEvent.change(screen.getByLabelText('Volume level'), { target: { value: '70' } });
  expect(ha.calls.at(-1)).toMatchObject({ service: 'volume_set', data: { volume_level: 0.7 } });
});

test('unavailable player is disabled', () => {
  renderWithMock(<MediaPlayerBar entity="ha:media_player.room" />, {
    'media_player.room': { state: 'unavailable' },
  });
  expect(screen.getByText('Unavailable')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Play' }) as HTMLButtonElement).disabled).toBe(true);
});
