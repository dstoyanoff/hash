import {
  LocalClient,
  mockLibrary,
  mockMediaPlayer,
  MockIntegration,
  type BrowseQuery,
  type BrowseResult,
  type EntityRef,
} from '@hashsome/core';
import { act, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { HashsomeProvider } from '../../provider.tsx';
import { MediaBrowser } from '../media-browser.tsx';

/** A client whose reads fail, as a connection that is not there does, until it is told it is back. */
class Flaky extends LocalClient {
  down = true;

  override browse(ref: EntityRef, query: BrowseQuery): Promise<BrowseResult> {
    return this.down
      ? Promise.reject(new Error('Not connected to runtime'))
      : super.browse(ref, query);
  }
}

test('the library asks again when the connection is back, instead of staying on its error', async () => {
  const ha = new MockIntegration({
    library: mockLibrary(),
    entities: {
      room: mockMediaPlayer({ name: 'Room', capabilities: { browse: true, search: true } }),
    },
  });

  const client = new Flaky([ha]);
  client.connect();
  render(
    <HashsomeProvider client={client}>
      <MediaBrowser entity="ha:room" />
    </HashsomeProvider>,
  );

  // The first ask failed.
  expect(await screen.findByText('Not connected to runtime')).toBeTruthy();
  expect(screen.queryByRole('tab', { name: 'Albums' })).toBeNull();

  // The connection drops, and then comes back some time later.
  await act(async () => {
    client.close();
  });

  expect(screen.getByText('Not connected to runtime')).toBeTruthy();
  await act(async () => {
    client.down = false;
    client.connect();
  });

  expect(await screen.findByRole('tab', { name: 'Albums' })).toBeTruthy();
  expect(screen.queryByText('Not connected to runtime')).toBeNull();
});
