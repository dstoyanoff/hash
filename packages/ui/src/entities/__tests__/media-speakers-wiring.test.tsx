import { mockMediaPlayer } from '@hashsome/core';
import { fireEvent, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { MediaPlayerBar } from '../media-player-bar.tsx';
import { MediaPlayerColumn } from '../media-player-column.tsx';
import { MediaPlayerFull } from '../media-player-full.tsx';

const rooms = (porch: Record<string, unknown> = {}) => ({
  porch: mockMediaPlayer({
    name: 'Porch',
    playback: 'playing',
    media: { title: 'Dreams' },
    groupable: ['ha:kitchen'],
    capabilities: { group: true, browse: true },
    ...porch,
  }),
  kitchen: mockMediaPlayer({ name: 'Kitchen', capabilities: { group: true } }),
});

test('a player that can be grouped has a speakers pill in the column, which opens the picker', async () => {
  renderWithMock(<MediaPlayerColumn entity="ha:porch" overlays />, rooms());
  fireEvent.click(screen.getByRole('button', { name: /^Speakers/ }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
});

test('grouping can be left out of the column, and a player that cannot be grouped has none', () => {
  const { unmount } = renderWithMock(
    <MediaPlayerColumn entity="ha:porch" overlays grouping={false} />,
    rooms(),
  );

  expect(screen.queryByRole('button', { name: /^Speakers/ })).toBeNull();
  unmount();
  renderWithMock(
    <MediaPlayerColumn entity="ha:porch" overlays />,
    rooms({ capabilities: { group: false } }),
  );

  expect(screen.queryByRole('button', { name: /^Speakers/ })).toBeNull();
});

test('the column’s allowlist reaches the picker', async () => {
  renderWithMock(
    <MediaPlayerColumn entity="ha:porch" overlays speakers={['ha:nobody']} />,
    rooms(),
  );

  fireEvent.click(screen.getByRole('button', { name: /^Speakers/ }));
  expect(await screen.findByText('No other speakers to add.')).toBeTruthy();
});

test('the bar with overlays has a speakers pill, unless grouping is off or the player cannot be grouped', async () => {
  const { unmount } = renderWithMock(<MediaPlayerBar entity="ha:porch" overlays />, rooms());
  fireEvent.click(screen.getByRole('button', { name: /^Speakers/ }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
  unmount();

  const off = renderWithMock(
    <MediaPlayerBar entity="ha:porch" overlays grouping={false} />,
    rooms(),
  );

  expect(screen.queryByRole('button', { name: /^Speakers/ })).toBeNull();
  off.unmount();
  renderWithMock(
    <MediaPlayerBar entity="ha:porch" overlays />,
    rooms({ capabilities: { group: false } }),
  );

  expect(screen.queryByRole('button', { name: /^Speakers/ })).toBeNull();
});

test('the full player has a speakers pill that opens the picker over it, for a player that can be grouped', async () => {
  const { unmount } = renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} />,
    rooms(),
  );

  fireEvent.click(screen.getByRole('button', { name: /^Speakers/ }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
  unmount();

  const off = renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} grouping={false} />,
    rooms(),
  );

  expect(screen.queryByRole('button', { name: /^Speakers/ })).toBeNull();
  off.unmount();
  renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} />,
    rooms({ capabilities: { group: false, browse: true } }),
  );

  expect(screen.queryByRole('button', { name: /^Speakers/ })).toBeNull();
});

test('inline, the pill swaps the speakers in for the list below the player, and back', async () => {
  renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} speakersView="inline" />,
    rooms(),
  );

  expect(screen.getByText('library')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^Speakers/ }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
  expect(screen.queryByText('library')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Speakers/ }));
  expect(await screen.findByText('library')).toBeTruthy();
});

test('the column’s drawer player has the pill too, which swaps the speakers in', async () => {
  renderWithMock(<MediaPlayerColumn entity="ha:porch" />, rooms());
  // Pressing the browse button opens the drawer with the whole player.
  fireEvent.click(screen.getByRole('button', { name: 'Browse media' }));
  const pills = await screen.findAllByRole('button', { name: /^Speakers/ });
  fireEvent.click(pills[pills.length - 1]!);
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
});
