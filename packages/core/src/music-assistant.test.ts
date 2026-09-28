import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MusicAssistantIntegration } from './music-assistant.ts';

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

test('maps a player to a HA-attribute-shaped entity state', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  expect(ma.getState('kitchen_speaker')).toEqual({
    ref: 'ma:kitchen_speaker',
    state: 'playing',
    attributes: {
      media_title: 'Blank Space',
      media_artist: 'More More',
      media_album_name: undefined,
      entity_picture: 'http://x/art.jpg',
      volume_level: 0.4,
      is_volume_muted: false,
    },
  });
});

test('an unavailable player is reported as unavailable', async () => {
  const { ma, socket } = make();
  await connect(ma, socket, [player({ available: false })]);
  expect(ma.getState('kitchen_speaker')?.state).toBe('unavailable');
});

test('player_updated and player_removed events update the store live', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  socket().receive({
    event: 'player_updated',
    object_id: 'kitchen_speaker',
    data: player({ playback_state: 'paused' }),
  });
  expect(ma.getState('kitchen_speaker')?.state).toBe('paused');
  socket().receive({ event: 'player_removed', object_id: 'kitchen_speaker' });
  expect(ma.getState('kitchen_speaker')).toBeUndefined();
});

test('callService maps media_player service calls to players/cmd/* with player_id', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  const call = ma.callService({
    domain: 'media_player',
    service: 'media_play',
    entityIds: ['kitchen_speaker'],
  });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'players/cmd/play',
    args: { player_id: 'kitchen_speaker' },
  });
  socket().receive({ message_id: socket().sent.at(-1)!.message_id, result: null });
  await expect(call).resolves.toBeUndefined();
});

test('volume_set converts 0..1 to 0..100 and volume_mute forwards muted', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  void ma.callService({
    domain: 'media_player',
    service: 'volume_set',
    entityIds: ['kitchen_speaker'],
    data: { volume_level: 0.7 },
  });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'players/cmd/volume_set',
    args: { player_id: 'kitchen_speaker', volume_level: 70 },
  });

  void ma.callService({
    domain: 'media_player',
    service: 'volume_mute',
    entityIds: ['kitchen_speaker'],
    data: { is_volume_muted: true },
  });
  await flush();
  expect(socket().sent.at(-1)).toMatchObject({
    command: 'players/cmd/volume_mute',
    args: { player_id: 'kitchen_speaker', muted: true },
  });
});

test('rejects a non-media_player domain and a missing target', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  await expect(ma.callService({ domain: 'light', service: 'turn_on' })).rejects.toThrow(
    /media_player/,
  );
  await expect(ma.callService({ domain: 'media_player', service: 'media_play' })).rejects.toThrow(
    /target player/,
  );
});

test('an unknown service rejects with a clear error', async () => {
  const { ma, socket } = make();
  await connect(ma, socket);
  await expect(
    ma.callService({ domain: 'media_player', service: 'nope', entityIds: ['kitchen_speaker'] }),
  ).rejects.toThrow(/does not support/);
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
  expect(ma.getState('kitchen_speaker')?.state).toBe('paused');
});

test('disconnect() stops pending reconnect attempts', async () => {
  const { ma, socket } = make({ reconnectMinMs: 100 });
  await connect(ma, socket);
  socket().close();
  ma.disconnect();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(FakeSocket.instances).toHaveLength(1);
});
