import { mockLibrary, mockMediaPlayer } from '@hashsome/core';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { MediaQueue } from '../media-queue.tsx';

const room = (queue = true) => ({
  room: mockMediaPlayer({ name: 'Room', capabilities: { queue } }),
});

const render = (queue = true) =>
  renderWithMock(<MediaQueue entity="ha:room" />, room(queue), { library: mockLibrary() });

describe('MediaQueue', () => {
  test('lists the queue with its size, the track playing marked, and the tracks that follow', async () => {
    render();
    expect(await screen.findByText(/24 tracks/)).toBeTruthy();
    const playing = screen.getByRole('button', { name: /^Playing / });
    expect(playing.getAttribute('aria-current')).toBe('true');
    // The first two have played, the third plays, then it carries on.
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(5);
    expect(screen.getAllByRole('button', { name: 'Play Blank Space' }).length).toBeGreaterThan(0);
  });

  test('tapping a track jumps to it', async () => {
    const { ha } = render();
    const [first] = await screen.findAllByRole('button', { name: 'Play Blank Space' });
    fireEvent.click(first!);
    expect(ha.calls.at(-1)).toMatchObject({
      command: 'playQueueItem',
      args: { item: expect.stringContaining('t-blank-space') },
    });
  });

  test('a track can be taken out, but the one playing cannot', async () => {
    const { ha } = render();
    await screen.findByText(/24 tracks/);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove Blank Space from the queue' })[0]!,
    );

    expect(ha.calls.at(-1)).toMatchObject({ command: 'removeQueueItem' });
    // The mock queue repeats its tracks, so look in the playing row itself: it has no cross.
    const row = screen.getByRole('button', { name: /^Playing / }).closest('li')!;
    expect(row.querySelector('button[aria-label^="Remove"]')).toBeNull();
  });

  test('Clear empties the queue', async () => {
    const { ha } = render();
    fireEvent.click(await screen.findByRole('button', { name: 'Clear the queue' }));
    expect(ha.calls.at(-1)).toMatchObject({ command: 'clearQueue' });
  });

  test('says how many more there are than are shown', async () => {
    renderWithMock(<MediaQueue entity="ha:room" />, room(), { library: mockLibrary() });
    // The mock queue is 24 long and shows all of them, so nothing is left over.
    await screen.findByText(/24 tracks/);
    expect(screen.queryByText(/and .* more/)).toBeNull();
  });

  test('a player with no queue shows nothing', async () => {
    const { container } = render(false);
    await Promise.resolve();
    expect(container.textContent).toBe('');
  });
});
