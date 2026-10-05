import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { UnknownEntityError } from '@hash/core';
import { MusicAssistantIntegration } from '../index.ts';

// Applies to every test in this file (vitest hooks aren't position-sensitive): fake timers so the
// reconnect-backoff tests can fast-forward, and `flush()` below drives both real microtasks and
// pending fake timers so the rest of the tests don't need real setTimeout(0) delays.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const flush = () => vi.advanceTimersByTimeAsync(0);

class FakeSocket extends EventTarget {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: { message_id: string; command: string; args?: Record<string, unknown> }[] = [];
  constructor(public url: string) {
    super();
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
  receive(message: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}

const player = (overrides: Record<string, unknown> = {}) => ({
  player_id: 'kitchen_speaker',
  available: true,
  playback_state: 'playing',
  volume_level: 40,
  volume_muted: false,
  current_media: {
    title: 'Blank Space',
    artist: 'More More',
    album: null,
    image_url: 'http://x/art.jpg',
  },
  ...overrides,
});

function make(options: { reconnectMinMs?: number } = {}) {
  FakeSocket.instances = [];
  const ma = new MusicAssistantIntegration({
    url: 'http://mass.local:8095',
    token: 'tok',
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    ...options,
  });

  return { ma, socket: () => FakeSocket.instances.at(-1)! };
}

/** Drives an already-opening socket through open -> auth ack -> players/all response. Used both
 * for the initial `connect()` and for a socket opened internally by auto-reconnect (which never
 * calls `connect()` again — see its doc comment). */
async function driveHandshake(socket: () => FakeSocket, players: unknown[] = [player()]) {
  await flush();
  socket().open();
  await flush();
  socket().receive({ message_id: socket().sent[0]!.message_id, result: { authenticated: true } });
  await flush();
  socket().receive({ message_id: socket().sent[1]!.message_id, result: players });
  // `connect()`'s own returned promise gives the happy path a natural point to await full
  // settlement; the internal reconnect path has no such promise (it's fire-and-forget), so this
  // flush is what lets its pending status-setting continuation actually run before we return.
  await flush();
}

async function connect(
  ma: MusicAssistantIntegration,
  socket: () => FakeSocket,
  players: unknown[] = [player()],
) {
  const done = ma.connect();
  await driveHandshake(socket, players);
  await done;
}

test('connects to <url>/ws, authenticates, then fetches players', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  expect(socket().url).toBe('ws://mass.local:8095/ws');
  expect(socket().sent[0]).toMatchObject({ command: 'auth', args: { token: 'tok' } });
  expect(socket().sent[1]).toMatchObject({ command: 'players/all' });
  expect(ma.status).toBe('connected');
});

test('maps a player to a native mediaPlayer entity', async () => {
  const { ma, socket } = make();
  await connect(ma, socket, [player({ display_name: 'Kitchen Speaker' })]);
  expect(ma.getEntity('kitchen_speaker')).toEqual({
    ref: 'ma:kitchen_speaker',
    kind: 'mediaPlayer',
    name: 'Kitchen Speaker',
    availability: 'ready',
    playback: 'playing',
    media: { title: 'Blank Space', artist: 'More More', artworkUrl: 'http://x/art.jpg' },
    volume: 0.4,
    muted: false,
    capabilities: {
      volume: true,
      mute: true,
      next: true,
      previous: true,
      browse: true,
      search: true,
      seek: true,
      shuffle: true,
      transfer: false,
      group: false,
    },
  });
});

test('the name falls back to the player id, and players without volume say so', async () => {
  const { ma, socket } = make();
  await connect(ma, socket, [player({ volume_level: null, volume_muted: null })]);
  expect(ma.getEntity('kitchen_speaker')).toMatchObject({
    name: 'kitchen_speaker',
    muted: false,
    capabilities: { volume: false, mute: false },
  });

  expect(ma.getEntity('kitchen_speaker')).not.toHaveProperty('volume');
});

test('an unavailable player is unavailable and off', async () => {
  const { ma, socket } = make();
  await connect(ma, socket, [player({ available: false })]);
  expect(ma.getEntity('kitchen_speaker')).toMatchObject({
    availability: 'unavailable',
    playback: 'off',
  });
});

test('player_updated and player_removed events update the store live', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  socket().receive({
    event: 'player_updated',
    object_id: 'kitchen_speaker',
    data: player({ playback_state: 'paused' }),
  });

  expect(ma.getEntity('kitchen_speaker')).toMatchObject({ playback: 'paused' });
  socket().receive({ event: 'player_removed', object_id: 'kitchen_speaker' });
  expect(ma.getEntity('kitchen_speaker')).toBeUndefined();
});

test('subscribing to a player that does not exist throws', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  expect(() => ma.subscribe('nope', () => {})).toThrow(UnknownEntityError);
});

test('transport commands map to players/cmd/* with the player id', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  const expected: Record<string, string> = {
    play: 'players/cmd/play',
    pause: 'players/cmd/pause',
    togglePlay: 'players/cmd/play_pause',
    next: 'players/cmd/next',
    previous: 'players/cmd/previous',
  };

  for (const [name, command] of Object.entries(expected)) {
    const call = ma.command('kitchen_speaker', name);
    await flush();
    expect(socket().sent.at(-1)).toMatchObject({ command, args: { player_id: 'kitchen_speaker' } });
    socket().receive({ message_id: socket().sent.at(-1)!.message_id, result: null });
    await expect(call).resolves.toBeUndefined();
  }
});

test('setVolume converts 0..1 to 0..100 and setMuted forwards muted', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  void ma.command('kitchen_speaker', 'setVolume', { volume: 0.7 });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'players/cmd/volume_set',
    args: { player_id: 'kitchen_speaker', volume_level: 70 },
  });

  void ma.command('kitchen_speaker', 'setMuted', { muted: true });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'players/cmd/volume_mute',
    args: { player_id: 'kitchen_speaker', muted: true },
  });
});

test('commands reject for an unknown player, an unknown command and bad arguments', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  await expect(ma.command('nope', 'play')).rejects.toThrow(UnknownEntityError);
  await expect(ma.command('kitchen_speaker', 'toggle')).rejects.toThrow(/no "toggle" command/);
  await expect(ma.command('kitchen_speaker', 'setVolume', { volume: 'loud' })).rejects.toThrow(
    /numeric volume/,
  );

  await expect(ma.command('kitchen_speaker', 'setMuted', {})).rejects.toThrow(/boolean/);
});

test('an auth error rejects connect() and sets status to error', async () => {
  const { ma, socket } = make();
  const done = ma.connect();
  await flush();
  socket().open();
  await flush();
  socket().receive({
    message_id: socket().sent[0]!.message_id,
    error_code: 401,
    details: 'bad token',
  });

  await expect(done).rejects.toThrow('bad token');
  expect(ma.status).toBe('error');
});

test('reconnects with backoff after the connection drops, and resumes serving state', async () => {
  const { ma, socket } = make({ reconnectMinMs: 100 });
  await connect(ma, socket);
  socket().close();
  expect(ma.status).toBe('disconnected');
  await vi.advanceTimersByTimeAsync(100);
  expect(FakeSocket.instances).toHaveLength(2);
  await driveHandshake(socket, [player({ playback_state: 'paused' })]);
  expect(ma.status).toBe('connected');
  expect(ma.getEntity('kitchen_speaker')).toMatchObject({ playback: 'paused' });
});

test('disconnect() stops pending reconnect attempts', async () => {
  const { ma, socket } = make({ reconnectMinMs: 100 });
  await connect(ma, socket);
  socket().close();
  ma.disconnect();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(FakeSocket.instances).toHaveLength(1);
});

test('position and duration come from the elapsed time Music Assistant reports', async () => {
  const { ma, socket } = make();
  await connect(ma, socket, [
    player({
      elapsed_time: 64,
      elapsed_time_last_updated: 1_767_225_600,
      current_media: { title: 'Blank Space', duration: 231 },
    }),
  ]);

  expect(ma.getEntity('kitchen_speaker')).toMatchObject({
    position: 64,
    duration: 231,
    positionUpdatedAt: '2026-01-01T00:00:00.000Z',
  });
});

test('seek and playMedia go to the player’s queue, with the mode as the queue option', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  void ma.command('kitchen_speaker', 'seek', { position: 12.4 });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'player_queues/seek',
    args: { queue_id: 'kitchen_speaker', position: 12 },
  });

  void ma.command('kitchen_speaker', 'playMedia', { item: 'library://album/12', mode: 'replace' });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'player_queues/play_media',
    args: { queue_id: 'kitchen_speaker', media: 'library://album/12', option: 'replace' },
  });

  await expect(ma.command('kitchen_speaker', 'playMedia', { item: '' })).rejects.toThrow(/item/);
  await expect(
    ma.command('kitchen_speaker', 'playMedia', { item: 'x://a/1', mode: 'loud' }),
  ).rejects.toThrow(/mode/);
});

/** Answers the next request the integration sent, the way the server would. */
const answer = async (socket: () => FakeSocket, result: unknown) => {
  await flush();
  socket().receive({ message_id: socket().sent.at(-1)!.message_id, result });
  await flush();
};

test('browse lists the shelves, then what is in a shelf, an album and an artist', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);

  const root = await ma.browse('kitchen_speaker', {});
  expect(root.items.map((item) => item.title)).toEqual([
    'Recently played',
    'Playlists',
    'Albums',
    'Artists',
    'Radio',
  ]);

  expect(root.items.every((item) => item.expandable && !item.playable)).toBe(true);

  const albums = ma.browse('kitchen_speaker', { path: 'shelf:albums' });
  await answer(socket, [
    {
      uri: 'library://album/12',
      name: '1989',
      media_type: 'album',
      artists: [{ name: 'Taylor Swift' }],
      image: { path: 'https://cdn.example/1989.jpg', remotely_accessible: true },
    },
    { name: 'no uri, dropped' },
  ]);

  expect(socket().sent.at(-1)).toMatchObject({ command: 'music/albums/library_items' });
  expect(await albums).toEqual({
    title: 'Albums',
    items: [
      {
        id: 'library://album/12',
        title: '1989',
        subtitle: 'Taylor Swift',
        kind: 'album',
        playable: true,
        expandable: true,
        artworkUrl: 'https://cdn.example/1989.jpg',
      },
    ],
  });

  const tracks = ma.browse('kitchen_speaker', { path: 'library://album/12' });
  await answer(socket, [
    { uri: 'library://track/3', name: 'Style', media_type: 'track', artist_str: 'Taylor Swift' },
  ]);

  expect(socket().sent.at(-1)).toMatchObject({
    command: 'music/albums/album_tracks',
    args: { item_id: '12', provider_instance_id_or_domain: 'library' },
  });

  expect((await tracks).items[0]).toMatchObject({
    kind: 'track',
    playable: true,
    expandable: false,
  });

  const albumsOfArtist = ma.browse('kitchen_speaker', { path: 'spotify://artist/abc' });
  await answer(socket, []);
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'music/artists/artist_albums',
    args: { item_id: 'abc', provider_instance_id_or_domain: 'spotify' },
  });

  expect((await albumsOfArtist).items).toEqual([]);
});

test('private pictures are not passed on, and browse validates what it is asked', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  const shelf = ma.browse('kitchen_speaker', { path: 'shelf:playlists' });
  await answer(socket, [
    {
      uri: 'library://playlist/1',
      name: 'Morning',
      media_type: 'playlist',
      image: { path: 'private/path.jpg', remotely_accessible: false },
    },
  ]);

  expect((await shelf).items[0]).not.toHaveProperty('artworkUrl');

  await expect(ma.browse('nobody', {})).rejects.toBeInstanceOf(UnknownEntityError);
  await expect(ma.browse('kitchen_speaker', { path: 'not a uri' })).rejects.toThrow(/media item/);
  await expect(ma.browse('kitchen_speaker', { path: 'library://track/1' })).rejects.toThrow(
    /nothing inside/,
  );
});

test('search asks Music Assistant once and lists albums, artists, tracks, playlists and radio', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  const found = ma.browse('kitchen_speaker', { search: 'swift' });
  await answer(socket, {
    albums: [{ uri: 'library://album/12', name: '1989', media_type: 'album' }],
    artists: [{ uri: 'library://artist/1', name: 'Taylor Swift', media_type: 'artist' }],
    tracks: [{ uri: 'library://track/3', name: 'Style', media_type: 'track' }],
    playlists: [],
    radio: [],
  });

  expect(socket().sent.at(-1)).toMatchObject({
    command: 'music/search',
    args: { search_query: 'swift' },
  });

  expect((await found).items.map((item) => item.kind)).toEqual(['album', 'artist', 'track']);
});

test('shuffle is read from the queues, kept up to date by queue events, and set on the queue', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  expect(ma.getEntity('kitchen_speaker')).not.toHaveProperty('shuffle');

  // The queues are asked for once the players are known.
  expect(socket().sent.at(-1)).toMatchObject({ command: 'player_queues/all' });
  socket().receive({
    message_id: socket().sent.at(-1)!.message_id,
    result: [{ queue_id: 'kitchen_speaker', shuffle_enabled: true }],
  });

  await flush();
  expect(ma.getEntity('kitchen_speaker')).toMatchObject({
    shuffle: true,
    capabilities: { shuffle: true },
  });

  socket().receive({
    event: 'queue_updated',
    object_id: 'kitchen_speaker',
    data: { queue_id: 'kitchen_speaker', shuffle_enabled: false },
  });

  expect(ma.getEntity('kitchen_speaker')).toMatchObject({ shuffle: false });

  // A later player update keeps the queue's setting instead of losing it.
  socket().receive({
    event: 'player_updated',
    object_id: 'kitchen_speaker',
    data: player({ volume_level: 55 }),
  });

  expect(ma.getEntity('kitchen_speaker')).toMatchObject({ shuffle: false, volume: 0.55 });

  void ma.command('kitchen_speaker', 'setShuffle', { shuffle: true });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'player_queues/shuffle',
    args: { queue_id: 'kitchen_speaker', shuffle_enabled: true },
  });

  await expect(ma.command('kitchen_speaker', 'setShuffle', { shuffle: 'yes' })).rejects.toThrow(
    /boolean/,
  );
});

test('a server that does not answer for queues leaves shuffle unreported and does not hold up connect', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  expect(ma.status).toBe('connected');
  expect(ma.getEntity('kitchen_speaker')).not.toHaveProperty('shuffle');
});
