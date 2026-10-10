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

test('a player that can be grouped has a speakers button beside the title in the column, which opens the picker', async () => {
  renderWithMock(<MediaPlayerColumn entity="ha:porch" overlays />, rooms());
  fireEvent.click(screen.getByRole('button', { name: 'Speakers' }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
});

test('grouping can be left out of the column, and a player that cannot be grouped has none', () => {
  const { unmount } = renderWithMock(
    <MediaPlayerColumn entity="ha:porch" overlays grouping={false} />,
    rooms(),
  );

  expect(screen.queryByRole('button', { name: 'Speakers' })).toBeNull();
  unmount();
  renderWithMock(
    <MediaPlayerColumn entity="ha:porch" overlays />,
    rooms({ capabilities: { group: false } }),
  );

  expect(screen.queryByRole('button', { name: 'Speakers' })).toBeNull();
});

test('the column’s allowlist reaches the picker', async () => {
  renderWithMock(
    <MediaPlayerColumn entity="ha:porch" overlays speakers={['ha:nobody']} />,
    rooms(),
  );

  fireEvent.click(screen.getByRole('button', { name: 'Speakers' }));
  expect(await screen.findByText('No other speakers to add.')).toBeTruthy();
});

test('the bar with overlays has a speakers button, unless grouping is off or the player cannot be grouped', async () => {
  const { unmount } = renderWithMock(<MediaPlayerBar entity="ha:porch" overlays />, rooms());
  fireEvent.click(screen.getByRole('button', { name: 'Speakers' }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
  unmount();

  const off = renderWithMock(
    <MediaPlayerBar entity="ha:porch" overlays grouping={false} />,
    rooms(),
  );

  expect(screen.queryByRole('button', { name: 'Speakers' })).toBeNull();
  off.unmount();
  renderWithMock(
    <MediaPlayerBar entity="ha:porch" overlays />,
    rooms({ capabilities: { group: false } }),
  );

  expect(screen.queryByRole('button', { name: 'Speakers' })).toBeNull();
});

test('the full player has a Speakers tab when it is given the picker and the player can be grouped', () => {
  const picker = <p>who plays</p>;
  const { unmount } = renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} speakers={picker} />,
    rooms(),
  );

  expect(screen.getByRole('tablist', { name: 'Library, queue or speakers' })).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Speakers' }));
  expect(screen.getByText('who plays')).toBeTruthy();
  unmount();

  // Without it, or for a player that cannot be grouped, there is no tab.
  const none = renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} />,
    rooms(),
  );

  expect(screen.queryByRole('tab', { name: 'Speakers' })).toBeNull();
  none.unmount();
  renderWithMock(
    <MediaPlayerFull entity="ha:porch" browser={<p>library</p>} speakers={picker} />,
    rooms({ capabilities: { group: false, browse: true } }),
  );

  expect(screen.queryByRole('tab', { name: 'Speakers' })).toBeNull();
});

test('the column’s drawer player has the Speakers tab', async () => {
  renderWithMock(<MediaPlayerColumn entity="ha:porch" />, rooms());
  // Pressing the artwork opens the drawer with the whole player, and its tabs.
  fireEvent.click(screen.getByRole('button', { name: 'Browse media' }));
  fireEvent.click(await screen.findByRole('tab', { name: 'Speakers' }));
  expect(await screen.findByRole('button', { name: 'Add Kitchen to this stream' })).toBeTruthy();
});
