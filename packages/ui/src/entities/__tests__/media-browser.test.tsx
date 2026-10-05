import { mockLibrary, mockMediaPlayer } from '@hashsome/core';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { MediaBrowser } from '../media-browser.tsx';

const rooms = {
  room: mockMediaPlayer({
    name: 'Room',
    capabilities: { browse: true, search: true },
  }),
};

const render = (entities = rooms) =>
  renderWithMock(<MediaBrowser entity="ha:room" />, entities, { library: mockLibrary() });

test('the top level is a row of tabs, opening on the first, and no list of folders', async () => {
  render();
  const tabs = await screen.findAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    'Recently played',
    'Playlists',
    'Albums',
    'Artists',
    'Radio',
  ]);

  expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  // It opens straight onto the first shelf, so the first thing shown is music, not folders.
  expect(await screen.findByRole('button', { name: 'Play Dreams' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Open Albums' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
});

test('opening something changes only what is below the tabs, and the selected tab becomes the way back', async () => {
  render();
  fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
  expect(await screen.findByRole('button', { name: 'Open Rumours' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Open Rumours' }));
  expect(await screen.findByRole('button', { name: 'Play Go Your Own Way' })).toBeTruthy();
  // Search and tabs stay put; the selected tab now reads as the way back, named for what is open.
  expect(screen.getByRole('searchbox', { name: 'Search the library' })).toBeTruthy();
  expect(screen.getAllByRole('tab')).toHaveLength(5);
  const back = screen.getByRole('tab', { name: 'Back' });
  expect(back.getAttribute('aria-selected')).toBe('true');
  expect(back.textContent).toBe('Rumours');
  // No separate heading or back row is added under the tabs.
  expect(screen.queryByRole('heading')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  fireEvent.click(back);
  expect(await screen.findByRole('button', { name: 'Open Rumours' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Albums' }).getAttribute('aria-selected')).toBe('true');
});

test('nothing is inserted between the tabs and the content when something is opened', async () => {
  render();
  fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
  const list = async () => (await screen.findAllByRole('list')).at(-1) as HTMLElement;
  const before = await list();
  // What sits between the tab row and the list of items: nothing, before or after.
  const between = (el: HTMLElement) => {
    const tabs = screen.getByRole('tablist');
    let count = 0;
    for (let node = tabs.nextElementSibling; node && node !== el; node = node.nextElementSibling) {
      count += 1;
    }

    return count;
  };

  expect(between(before)).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Open Rumours' }));
  await screen.findByRole('button', { name: 'Play Go Your Own Way' });
  expect(between(await list())).toBe(0);
});

test('picking another tab from inside a shelf leaves what was open', async () => {
  render();
  fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Open Rumours' }));
  await screen.findByRole('button', { name: 'Play Go Your Own Way' });
  fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }));
  expect(await screen.findByRole('button', { name: 'Open Morning coffee' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Playlists' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.queryByRole('tab', { name: 'Back' })).toBeNull();
  expect(screen.queryByText('Rumours')).toBeNull();
});

test('a top level that is not just folders stays a plain list under a heading', async () => {
  renderWithMock(<MediaBrowser entity="ha:room" />, rooms, {
    library: {
      root: {
        items: [
          { id: 'f', title: 'Local media', kind: 'folder', playable: false, expandable: true },
          { id: 's', title: 'Lofi Beats', kind: 'radio', playable: true, expandable: false },
        ],
      },
    },
  });

  expect(await screen.findByRole('button', { name: 'Open Local media' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Play Lofi Beats' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Library' })).toBeTruthy();
  expect(screen.queryByRole('tab')).toBeNull();
});

test('a single folder is not worth a tab bar', async () => {
  renderWithMock(<MediaBrowser entity="ha:room" />, rooms, {
    library: {
      root: {
        items: [{ id: 'f', title: 'Only', kind: 'folder', playable: false, expandable: true }],
      },
    },
  });

  expect(await screen.findByRole('button', { name: 'Open Only' })).toBeTruthy();
  expect(screen.queryByRole('tab')).toBeNull();
});

test('a track plays on a tap, and an album has its own play button beside it', async () => {
  const { ha } = render();
  fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Play 1989' }));
  expect(ha.calls.at(-1)).toMatchObject({
    entityId: 'room',
    command: 'playMedia',
    args: { item: 'al-1989' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Open 1989' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Play Style' }));
  expect(ha.calls.at(-1)).toMatchObject({ command: 'playMedia', args: { item: 't-style' } });
});

test('the search box shows only for a library that can be searched, and lists matches', async () => {
  const { unmount } = render({
    room: mockMediaPlayer({ name: 'Room', capabilities: { browse: true, search: false } }),
  });

  await screen.findByRole('tab', { name: 'Albums' });
  expect(screen.queryByRole('searchbox', { name: 'Search the library' })).toBeNull();
  unmount();

  render();
  await screen.findByRole('tab', { name: 'Albums' });
  const box = screen.getByRole('searchbox', { name: 'Search the library' });
  act(() => {
    fireEvent.change(box, { target: { value: 'dream' } });
  });

  expect(await screen.findByRole('button', { name: 'Play Dreams' })).toBeTruthy();
  // The tabs stay, with none selected: results belong to no shelf.
  expect(screen.getAllByRole('tab')).toHaveLength(5);
  expect(
    screen.getAllByRole('tab').some((tab) => tab.getAttribute('aria-selected') === 'true'),
  ).toBe(false);

  act(() => {
    fireEvent.change(box, { target: { value: 'zzzz' } });
  });

  expect(await screen.findByText('Nothing found.')).toBeTruthy();
  // The clear button empties the search and returns to the shelf.
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  // The search box empties and the tabs come back.
  expect(await screen.findByRole('tab', { name: 'Albums' })).toBeTruthy();
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  expect(screen.getByRole('tab', { name: 'Recently played' }).getAttribute('aria-selected')).toBe(
    'true',
  );
});

test('picking a tab while searching ends the search', async () => {
  render();
  await screen.findByRole('tab', { name: 'Albums' });
  act(() => {
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'dream' } });
  });

  await screen.findByRole('button', { name: 'Play Dreams' });
  fireEvent.click(screen.getByRole('tab', { name: 'Artists' }));
  expect(await screen.findByRole('button', { name: 'Open Fleetwood Mac' })).toBeTruthy();
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
});

test('a library that cannot be read shows the reason', async () => {
  renderWithMock(<MediaBrowser entity="ha:room" />, rooms);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Nothing at/));
});

describe('layouts', () => {
  const rows = () => screen.getAllByRole('list').at(-1) as HTMLElement;
  const show = (layout?: 'list' | 'theater' | 'auto') =>
    renderWithMock(<MediaBrowser entity="ha:room" {...(layout ? { layout } : {})} />, rooms, {
      library: mockLibrary(),
    });

  test('the default is a column of rows', async () => {
    show();
    await screen.findByRole('button', { name: 'Play Dreams' });
    expect(getComputedStyle(rows()).flexDirection).toBe('column');
  });

  test('theater is a single row of cards that scrolls sideways', async () => {
    show('theater');
    await screen.findByRole('button', { name: 'Play Dreams' });
    const row = rows();
    expect(getComputedStyle(row).flexDirection).not.toBe('column');
    expect(getComputedStyle(row).overflowX).toBe('auto');
    // The same items, opened and played the same way.
    fireEvent.click(screen.getByRole('tab', { name: 'Albums' }));
    expect(await screen.findByRole('button', { name: 'Open Rumours' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play Rumours' }));
  });

  test.each(['list', 'theater'] as const)(
    'a long title is cut with an ellipsis instead of running over the next item (%s)',
    async (layout) => {
      show(layout);
      await screen.findByRole('button', { name: 'Play Dreams' });
      const title = screen.getAllByText('Dreams')[0] as HTMLElement;
      const style = getComputedStyle(title);
      expect(style.whiteSpace).toBe('nowrap');
      expect(style.textOverflow).toBe('ellipsis');
      expect(style.overflow).toBe('hidden');
    },
  );

  test('the search keeps its height when the list takes all the room', async () => {
    show();
    await screen.findByRole('button', { name: 'Play Dreams' });
    const search = screen.getByRole('searchbox', { name: 'Search the library' }).parentElement!;
    expect(getComputedStyle(search).flexShrink).toBe('0');
    // The list is what gives way: it scrolls inside the room it has.
    expect(getComputedStyle(rows()).overflowY).toBe('auto');
  });

  test('a row’s play button is not squeezed by a long title', async () => {
    show();
    fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
    // An album can be opened and played, so it has a play button of its own beside the title.
    const play = await screen.findByRole('button', { name: 'Play Rumours' });
    expect(getComputedStyle(play).flexShrink).toBe('0');
  });

  test('a theater card is large, an artist’s is round, and its play button sits over the artwork', async () => {
    const { ha } = show('theater');
    fireEvent.click(await screen.findByRole('tab', { name: 'Artists' }));
    const artist = await screen.findByRole('button', { name: 'Open Fleetwood Mac' });
    const artwork = artist.querySelector('img')!.parentElement as HTMLElement;
    // Up to 200px, and less only when the row is too short for that (a container query, not measured in jsdom).
    expect(getComputedStyle(artwork).width).toMatch(/^min\(200px,/);
    expect(getComputedStyle(artwork).borderRadius).toBe('999px');
    fireEvent.click(screen.getByRole('button', { name: 'Play Fleetwood Mac' }));
    expect(ha.calls.at(-1)).toMatchObject({ command: 'playMedia', args: { item: 'ar-mac' } });

    fireEvent.click(screen.getByRole('tab', { name: 'Albums' }));
    const album = await screen.findByRole('button', { name: 'Open Rumours' });
    expect(
      getComputedStyle(album.querySelector('img')!.parentElement as HTMLElement).borderRadius,
    ).not.toBe('999px');
  });

  test('a card with no artwork shows the kind’s icon, large', async () => {
    renderWithMock(<MediaBrowser entity="ha:room" layout="theater" />, rooms, {
      library: {
        root: {
          items: [
            { id: 'r', title: 'Lofi Beats', kind: 'radio', playable: true, expandable: false },
          ],
        },
      },
    });

    const card = await screen.findByRole('button', { name: 'Play Lofi Beats' });
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('svg')).not.toBeNull();
  });
});
