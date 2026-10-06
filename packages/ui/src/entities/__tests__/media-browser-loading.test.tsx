import {
  LocalClient,
  mockLibrary,
  mockMediaPlayer,
  MockIntegration,
  type BrowseQuery,
  type BrowseResult,
  type EntityRef,
} from '@hashsome/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { HashsomeProvider } from '../../provider.tsx';
import { MediaBrowser } from '../media-browser.tsx';

/** A client whose reads of a shelf (not the top level) are answered when the test says so. */
class Held extends LocalClient {
  held: { resolve: (result: BrowseResult) => void; query: BrowseQuery }[] = [];
  hold = false;

  override browse(ref: EntityRef, query: BrowseQuery): Promise<BrowseResult> {
    if (!this.hold || query.path === undefined) {
      return super.browse(ref, query);
    }

    return new Promise((resolve) => this.held.push({ resolve, query }));
  }
}

afterEach(cleanup);

const show = (layout: 'list' | 'theater') => {
  const ha = new MockIntegration({
    library: mockLibrary(),
    entities: {
      room: mockMediaPlayer({ name: 'Room', capabilities: { browse: true, search: true } }),
    },
  });

  const client = new Held([ha]);
  client.connect();
  render(
    <HashsomeProvider client={client}>
      <MediaBrowser entity="ha:room" layout={layout} />
    </HashsomeProvider>,
  );

  return client;
};

/** What decides how much room the row takes in the layout. */
const room = (el: HTMLElement) => {
  const style = getComputedStyle(el);
  return { flex: style.flex, minHeight: style.minHeight, container: style.containerType };
};

test('while a tab loads, placeholder cards take the room the cards will, so the library does not change height', async () => {
  const client = show('theater');
  const row = async () => (await screen.findAllByRole('list')).at(-1) as HTMLElement;
  const loaded = room(await row());

  client.hold = true;
  fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
  const loading = await screen.findByRole('status', { name: 'Loading' });
  expect(loading.getAttribute('aria-busy')).toBe('true');
  expect(room(loading)).toEqual(loaded);
  // Placeholders, not a line of text.
  expect(screen.queryByText('Loading…')).toBeNull();
  expect(loading.querySelectorAll('li').length).toBeGreaterThan(4);

  // The answer arrives: the real cards take the same room.
  await act(async () => {
    for (const { resolve, query } of client.held) {
      resolve(await LocalClient.prototype.browse.call(client, 'ha:room', query));
    }
  });

  expect(await screen.findByRole('button', { name: 'Open Rumours' })).toBeTruthy();
  expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull();
  expect(room(await row())).toEqual(loaded);
});

test('nothing found keeps the room of the row too', async () => {
  const client = show('theater');
  const row = async () => (await screen.findAllByRole('list')).at(-1) as HTMLElement;
  const loaded = room(await row());

  client.hold = true;
  fireEvent.click(await screen.findByRole('tab', { name: 'Albums' }));
  await screen.findByRole('status', { name: 'Loading' });
  await act(async () => {
    for (const { resolve } of client.held) {
      resolve({ items: [] });
    }
  });

  const message = (await screen.findByText('Nothing here.')).parentElement as HTMLElement;
  expect(room(message)).toEqual(loaded);
});

test('in the list layout the placeholders are rows', async () => {
  const client = show('list');
  await screen.findAllByRole('tab');
  client.hold = true;
  fireEvent.click(screen.getByRole('tab', { name: 'Albums' }));
  const loading = await screen.findByRole('status', { name: 'Loading' });
  expect(getComputedStyle(loading).flexDirection).toBe('column');
  expect(loading.querySelectorAll('li').length).toBeGreaterThan(3);
});
