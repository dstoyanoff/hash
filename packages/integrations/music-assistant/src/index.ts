import {
  BaseIntegration,
  UnknownEntityError,
  type BrowseItem,
  type BrowseQuery,
  type BrowseResult,
  type EntityInput,
  type QueueQuery,
  type QueueResult,
} from '@hashsome/core';
import { parseUri, SHELVES, toBrowseItem, type MaItem } from './browse.ts';
import { toMediaPlayer, type MaPlayer } from './mapper.ts';
import { toQueueItems, type MaQueueItem } from './queue.ts';
import { onPlayback, onQueue, positionOf, type Position } from './position.ts';

/**
 * Direct client for the Music Assistant WebSocket API (not via Home Assistant), reverse-engineered
 * from https://github.com/music-assistant/server (`music_assistant/controllers/webserver` and
 * `music_assistant/controllers/players`) — there is no published spec and no official JS client.
 *
 * Protocol: connect to `<url>/ws`; the server sends a server-info message first (ignored here).
 * The client authenticates with `{ message_id, command: "auth", args: { token } }`; the server
 * replies with a success/error result and, on success, starts pushing `player_added` /
 * `player_updated` / `player_removed` events unprompted. Commands are
 * `{ message_id, command: "players/cmd/<x>", args: {...} }`, answered by a result carrying the
 * same `message_id`.
 *
 * Local entity ids are the player's own `player_id` verbatim (`ma:<player_id>`), not a
 * `domain.name` pair like Home Assistant's — Music Assistant's player ids are opaque strings that
 * may themselves contain dots, so splitting on one would be ambiguous.
 *
 * Every player is a native `mediaPlayer` entity (see `@hashsome/core`'s model): there is no Home
 * Assistant vocabulary here, and `command()` maps the model's commands straight to `players/cmd/*`.
 */

export interface MusicAssistantOptions {
  /** Base URL, e.g. `http://mass.local:8095`. */
  url: string;

  /** Access token, created in Music Assistant under Settings → Profile. */
  token: string;

  /** Integration id used in entity refs. Defaults to `ma`. */
  id?: string;

  /** Override for tests. */
  createSocket?: (url: string) => WebSocket;
  reconnectMinMs?: number;
  reconnectMaxMs?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMaPlayer = (value: unknown): value is MaPlayer =>
  isRecord(value) && typeof value.player_id === 'string';

/** Maps a model command onto a Music Assistant `players/cmd/*` command, validating its arguments. */
function commandFor(
  name: string,
  args: Record<string, unknown> | undefined,
): { command: string; args?: Record<string, unknown>; idKey?: 'player_id' | 'queue_id' } {
  switch (name) {
    case 'play':
      return { command: 'players/cmd/play' };
    case 'pause':
      return { command: 'players/cmd/pause' };
    case 'togglePlay':
      return { command: 'players/cmd/play_pause' };
    case 'next':
      return { command: 'players/cmd/next' };
    case 'previous':
      return { command: 'players/cmd/previous' };
    case 'setVolume': {
      const volume = args?.volume;
      if (typeof volume !== 'number' || !Number.isFinite(volume)) {
        throw new Error('setVolume needs a numeric volume between 0 and 1');
      }

      return {
        command: 'players/cmd/volume_set',
        args: { volume_level: Math.round(Math.min(1, Math.max(0, volume)) * 100) },
      };
    }

    case 'setMuted':
      if (typeof args?.muted !== 'boolean') {
        throw new Error('setMuted needs a boolean "muted"');
      }

      return { command: 'players/cmd/volume_mute', args: { muted: args.muted } };
    case 'setShuffle':
      if (typeof args?.shuffle !== 'boolean') {
        throw new Error('setShuffle needs a boolean "shuffle"');
      }

      return {
        command: 'player_queues/shuffle',
        args: { shuffle_enabled: args.shuffle },
        idKey: 'queue_id',
      };
    case 'seek': {
      const position = args?.position;
      if (typeof position !== 'number' || !Number.isFinite(position)) {
        throw new Error('seek needs a numeric position in seconds');
      }

      // Queues are addressed by their own id, which is the player's.
      return {
        command: 'player_queues/seek',
        args: { position: Math.max(0, Math.round(position)) },
        idKey: 'queue_id',
      };
    }

    case 'playMedia': {
      const mode = args?.mode ?? 'play';
      if (typeof args?.item !== 'string' || args.item === '') {
        throw new Error('playMedia needs an item id');
      }

      if (!['play', 'replace', 'next', 'add'].includes(String(mode))) {
        throw new Error('"mode" must be play, replace, next or add');
      }

      const { context, shuffle } = args;
      if (context !== undefined && (typeof context !== 'string' || context === '')) {
        throw new Error('"context" must be the id of an album or playlist');
      }

      if (shuffle !== undefined && typeof shuffle !== 'boolean') {
        throw new Error('"shuffle" must be true or false');
      }

      return {
        command: 'player_queues/play_media',
        args: {
          // A track in an album or playlist: queue all of it and start at the track.
          media: context ?? args.item,
          option: mode,
          ...(context !== undefined ? { start_item: args.item } : {}),
          ...(shuffle !== undefined ? { shuffle } : {}),
        },
        idKey: 'queue_id',
      };
    }

    case 'playQueueItem':
    case 'removeQueueItem': {
      if (typeof args?.item !== 'string' || args.item === '') {
        throw new Error(`${name} needs the id of a queue item`);
      }

      return name === 'playQueueItem'
        ? { command: 'player_queues/play_index', args: { index: args.item }, idKey: 'queue_id' }
        : {
            command: 'player_queues/delete_item',
            args: { item_id_or_index: args.item },
            idKey: 'queue_id',
          };
    }

    case 'clearQueue':
      // Music Assistant's clear without the stop it sends by default: the queue is emptied and what
      // plays is left to finish, with nothing after it. Depending on the state of the queue, the
      // playing track may also leave the queue (and so the queue panel) while it plays on.
      return { command: 'player_queues/clear', args: { skip_stop: true }, idKey: 'queue_id' };

    default:
      throw new Error(`A media player has no "${name}" command`);
  }
}

function wsUrl(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/ws`;
  return parsed.toString();
}

/** What a queue says that the player entity shows. */
interface QueueState {
  shuffle?: boolean;
  position: Position;
}

const samePosition = (a: Position, b: Position) =>
  a.item === b.item &&
  a.elapsed === b.elapsed &&
  a.resume === b.resume &&
  a.held === b.held &&
  a.inherited === b.inherited;

/** Which track a queue is on, as something comparable: its address when it has one, else its name or place. */
function itemOf(queue: Record<string, unknown>): string | undefined {
  // The track's own address. The queue's id for the item is not kept when a stopped queue is
  // resumed, so it would make a resume look like a different track.
  const current = queue.current_item;
  if (isRecord(current)) {
    const media = current.media_item;
    if (isRecord(media) && typeof media.uri === 'string') {
      return media.uri;
    }

    if (typeof current.name === 'string') {
      return current.name;
    }

    if (typeof current.queue_item_id === 'string') {
      return current.queue_item_id;
    }
  }

  return typeof queue.current_index === 'number' ? `#${queue.current_index}` : undefined;
}

export class MusicAssistantIntegration extends BaseIntegration {
  readonly id: string;
  #options: MusicAssistantOptions;
  #socket: WebSocket | undefined;
  #nextMessageId = 1;

  /** The last raw player and what its queue says, so either can change without the other. A queue
   * has the player's id. */
  #players = new Map<string, MaPlayer>();
  #queues = new Map<string, QueueState>();
  #pending = new Map<
    string,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  #stopped = true;
  #retry = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;

  /** True once the initial handshake has succeeded at least once — only then does a later close
   * count as a "drop" worth auto-reconnecting; a close during the *first* attempt is a connect()
   * failure that the runtime's own startup retry loop owns (see `connect()`'s doc comment). */
  #everConnected = false;

  constructor(options: MusicAssistantOptions) {
    super();
    this.id = options.id ?? 'ma';
    this.#options = options;
  }

  /** Resolves once authenticated and the initial player list has been fetched. Later drops are
   * reconnected internally with backoff (mirrors how the runtime treats every integration: it
   * only calls `connect()` once, at startup). */
  connect(): Promise<void> {
    if (!this.#stopped) {
      return Promise.resolve();
    }

    this.#stopped = false;
    this.setStatus('connecting');
    return this.#open();
  }

  disconnect(): void {
    this.#stopped = true;
    clearTimeout(this.#timer);
    for (const { reject } of this.#pending.values()) {
      reject(new Error('Disconnected'));
    }

    this.#pending.clear();
    this.#socket?.close();
    this.#socket = undefined;
    this.setStatus('disconnected');
  }

  async command(entityId: string, name: string, args?: Record<string, unknown>): Promise<void> {
    if (!this.getEntity(entityId)) {
      throw new UnknownEntityError(this.id, entityId);
    }

    const { command, args: commandArgs, idKey = 'player_id' } = commandFor(name, args);
    await this.#send(command, { [idKey]: entityId, ...commandArgs });
  }

  /**
   * The player's queue: a window of `limit` tracks starting two before the one playing, with how many
   * the whole queue has (it can be thousands, left over from earlier playback), so a panel shows
   * what has just played and what is coming without pulling all of it.
   */
  async queue(entityId: string, query: QueueQuery): Promise<QueueResult> {
    if (!this.getEntity(entityId)) {
      throw new UnknownEntityError(this.id, entityId);
    }

    const queue = await this.#send('player_queues/get', { queue_id: entityId });
    if (!isRecord(queue)) {
      return { items: [], total: 0, offset: 0 };
    }

    const total = typeof queue.items === 'number' ? queue.items : 0;
    const playing = typeof queue.current_index === 'number' ? queue.current_index : 0;
    const offset = Math.max(0, playing - 2);
    const raw = await this.#send('player_queues/items', {
      queue_id: entityId,
      limit: query.limit ?? 30,
      offset,
    });

    const current = isRecord(queue.current_item) ? queue.current_item.queue_item_id : undefined;
    return {
      items: toQueueItems(
        Array.isArray(raw) ? (raw as MaQueueItem[]) : [],
        typeof current === 'string' ? current : undefined,
      ),
      total,
      offset,
    };
  }

  /** One level of the library, or a search across it, through Music Assistant's own API. */
  async browse(entityId: string, query: BrowseQuery): Promise<BrowseResult> {
    if (!this.getEntity(entityId)) {
      throw new UnknownEntityError(this.id, entityId);
    }

    if (query.search !== undefined) {
      return this.#search(query.search);
    }

    if (query.path === undefined) {
      return { items: SHELVES.map((shelf) => ({ ...shelf, playable: false, expandable: true })) };
    }

    const shelf = SHELVES.find((candidate) => candidate.id === query.path);
    const found = shelf ? await this.#shelfItems(shelf.id) : await this.#childItems(query.path);
    return { ...(shelf ? { title: shelf.title } : {}), items: found };
  }

  async #shelfItems(shelfId: string): Promise<BrowseItem[]> {
    const library: Record<string, [string, Record<string, unknown>]> = {
      'shelf:recent': ['music/recently_played_items', { limit: 25 }],
      'shelf:playlists': ['music/playlists/library_items', { limit: 200, order_by: 'name' }],
      'shelf:albums': ['music/albums/library_items', { limit: 200, order_by: 'name' }],
      'shelf:artists': ['music/artists/library_items', { limit: 200, order_by: 'name' }],
      'shelf:radio': ['music/radios/library_items', { limit: 200, order_by: 'name' }],
    };

    const [command, args] = library[shelfId] ?? [];
    return command ? this.#items(await this.#send(command, args ?? {})) : [];
  }

  /** What is inside an album, a playlist or an artist. */
  async #childItems(uri: string): Promise<BrowseItem[]> {
    const { provider, type, id } = parseUri(uri);
    const command = {
      album: 'music/albums/album_tracks',
      playlist: 'music/playlists/playlist_tracks',
      artist: 'music/artists/artist_albums',
    }[type];

    if (!command) {
      throw new Error(`"${uri}" has nothing inside it`);
    }

    return this.#items(
      await this.#send(command, { item_id: id, provider_instance_id_or_domain: provider }),
    );
  }

  async #search(text: string): Promise<BrowseResult> {
    const results = await this.#send('music/search', {
      search_query: text,
      media_types: ['album', 'artist', 'track', 'playlist', 'radio'],
      limit: 8,
    });

    const groups = isRecord(results)
      ? [results.albums, results.artists, results.tracks, results.playlists, results.radio]
      : [];

    return { title: `Results for “${text}”`, items: groups.flatMap((group) => this.#items(group)) };
  }

  #items(list: unknown): BrowseItem[] {
    return Array.isArray(list)
      ? list.flatMap((item) => {
          const mapped = isRecord(item) ? toBrowseItem(item as MaItem) : undefined;
          return mapped ? [mapped] : [];
        })
      : [];
  }

  async #open(): Promise<void> {
    const socket = (this.#options.createSocket ?? ((url) => new WebSocket(url)))(
      wsUrl(this.#options.url),
    );

    this.#socket = socket;

    socket.addEventListener('message', (event) => {
      this.#handle(String((event as MessageEvent).data));
    });

    const closed = new Promise<never>((_resolve, reject) => {
      socket.addEventListener('close', () => {
        if (this.#socket !== socket) {
          return;
        }

        this.#socket = undefined;
        for (const { reject: rejectPending } of this.#pending.values()) {
          rejectPending(new Error('Connection lost'));
        }

        this.#pending.clear();
        reject(new Error('Music Assistant connection closed'));
        // A close during the first handshake is this attempt failing (status is already
        // 'error', set below) — only a drop after a prior success should move to 'disconnected'
        // and trigger our own reconnect; a first-attempt failure is retried by the caller.
        if (this.#everConnected) {
          this.setStatus('disconnected');
          if (!this.#stopped) {
            this.#scheduleReconnect();
          }
        }
      });
    });

    const opened = new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve());
      socket.addEventListener('error', () =>
        reject(new Error('Music Assistant connection failed')),
      );
    });

    try {
      await Promise.race([opened, closed]);
      await Promise.race([this.#authenticateAndLoad(), closed]);
      this.#everConnected = true;
      this.#retry = 0;
      this.setStatus('connected');
    } catch (error) {
      this.setStatus('error');
      socket.close();
      throw error;
    }
  }

  #scheduleReconnect(): void {
    const min = this.#options.reconnectMinMs ?? 500;
    const max = this.#options.reconnectMaxMs ?? 10_000;
    const delay = Math.min(max, min * 2 ** this.#retry++);
    this.#timer = setTimeout(() => {
      if (this.#stopped) {
        return;
      }

      this.setStatus('connecting');
      this.#open().catch(() => this.#scheduleReconnect());
    }, delay);
  }

  async #authenticateAndLoad(): Promise<void> {
    await this.#send('auth', { token: this.#options.token });
    const players = await this.#send('players/all', {});
    const next = new Map<string, EntityInput>();
    this.#players.clear();
    if (Array.isArray(players)) {
      for (const player of players) {
        if (isMaPlayer(player)) {
          this.#players.set(player.player_id, player);
          next.set(player.player_id, this.#entityFor(player));
        }
      }
    }

    this.replaceEntities(next);
    // Shuffle lives on the queues. They are asked for after the players are known, and without
    // holding the connection up: a server that does not answer just leaves shuffle unreported.
    this.#send('player_queues/all', {}).then(
      (queues) => {
        if (Array.isArray(queues)) {
          queues.forEach((queue) => this.#applyQueue(queue));
        }
      },
      () => {},
    );
  }

  /** What a player looks like with its queue's shuffle setting and position copied onto it. The
   * position is the queue's, not the player's: when playback is resumed Music Assistant starts a
   * new stream at the saved spot, and the player's own counter then starts from 0 again, while
   * the queue keeps counting through the track. */
  #entityFor(player: MaPlayer): EntityInput {
    const queue = this.#queues.get(player.player_id);
    if (!queue) {
      // A stopped player's own counter is back at the start: until the queue says more, no position.
      return toMediaPlayer(
        player.playback_state === 'idle'
          ? { ...player, elapsed_time: null, elapsed_time_last_updated: null }
          : player,
      );
    }

    const position = positionOf(queue.position, player.playback_state);
    return toMediaPlayer({
      ...player,
      ...(queue.shuffle !== undefined ? { shuffle_enabled: queue.shuffle } : {}),
      ...(position !== undefined
        ? { elapsed_time: position, elapsed_time_last_updated: queue.position.elapsedAt }
        : {}),
    });
  }

  #applyQueue(queue: unknown): void {
    if (!isRecord(queue) || typeof queue.queue_id !== 'string') {
      return;
    }

    const known = this.#queues.get(queue.queue_id) ?? { position: {} };
    const player = this.#players.get(queue.queue_id);
    const message = {
      item: itemOf(queue),
      elapsed: typeof queue.elapsed_time === 'number' ? queue.elapsed_time : undefined,
      resume: typeof queue.resume_pos === 'number' ? queue.resume_pos : undefined,
    };

    // The player's state says whether it is stopped; the queue's own `state` is not kept in step.
    const playback =
      player?.playback_state ?? (typeof queue.state === 'string' ? queue.state : undefined);

    const next: QueueState = {
      ...known,
      ...(typeof queue.shuffle_enabled === 'boolean' ? { shuffle: queue.shuffle_enabled } : {}),
      position: onQueue(known.position, message, playback, Date.now() / 1000),
    };

    this.#changeQueue(queue.queue_id, known, next);
  }

  /** Keeps a queue's new state and, when something it shows changed, the player's entity. */
  #changeQueue(id: string, known: QueueState, next: QueueState): void {
    if (next.shuffle === known.shuffle && samePosition(next.position, known.position)) {
      this.#queues.set(id, next);
      return;
    }

    this.#queues.set(id, next);
    const player = this.#players.get(id);
    if (player) {
      this.setEntity(player.player_id, this.#entityFor(player));
    }
  }

  /** A player changed state: a stop remembers where it got to, a start from a stop begins there. */
  #playerChanged(id: string, from: string | undefined, to: string | undefined): void {
    const known = this.#queues.get(id);
    if (known) {
      this.#queues.set(id, {
        ...known,
        position: onPlayback(known.position, from, to, Date.now() / 1000),
      });
    }
  }

  #send(command: string, args: Record<string, unknown>): Promise<unknown> {
    const socket = this.#socket;
    if (!socket) {
      return Promise.reject(new Error('Not connected'));
    }

    const messageId = String(this.#nextMessageId++);
    return new Promise((resolve, reject) => {
      this.#pending.set(messageId, { resolve, reject });
      socket.send(JSON.stringify({ message_id: messageId, command, args }));
    });
  }

  #handle(raw: string): void {
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    if (!isRecord(message)) {
      return;
    }

    if (typeof message.event === 'string') {
      this.#handleEvent(message.event, message.object_id, message.data);
      return;
    }

    if (typeof message.message_id !== 'string') {
      return;
    }

    const pending = this.#pending.get(message.message_id);
    if (!pending) {
      return;
    }

    this.#pending.delete(message.message_id);
    if (typeof message.error_code === 'number') {
      pending.reject(
        new Error(
          typeof message.details === 'string'
            ? message.details
            : `Music Assistant error ${message.error_code}`,
        ),
      );
    } else if ('result' in message) {
      pending.resolve(message.result);
    }
  }

  #handleEvent(event: string, objectId: unknown, data: unknown): void {
    switch (event) {
      case 'player_added':
      case 'player_updated':
        if (isMaPlayer(data)) {
          this.#playerChanged(
            data.player_id,
            this.#players.get(data.player_id)?.playback_state,
            data.playback_state,
          );

          this.#players.set(data.player_id, data);
          this.setEntity(data.player_id, this.#entityFor(data));
        }

        return;
      case 'queue_added':
      case 'queue_updated':
        this.#applyQueue(data);
        return;
      case 'player_removed':
        if (typeof objectId === 'string') {
          this.#players.delete(objectId);
          this.#queues.delete(objectId);
          this.setEntity(objectId, undefined);
        }

        return;
      default:
        return;
    }
  }
}
