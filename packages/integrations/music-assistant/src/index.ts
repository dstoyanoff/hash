import { BaseIntegration, formatEntityRef, type EntityState, type ServiceCall } from '@hash/core';

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

interface MaPlayerMedia {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  image_url?: string | null;
}

interface MaPlayer {
  player_id: string;
  available?: boolean;
  playback_state?: string;
  volume_level?: number | null;
  volume_muted?: boolean | null;
  current_media?: MaPlayerMedia | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMaPlayer = (value: unknown): value is MaPlayer =>
  isRecord(value) && typeof value.player_id === 'string';

function toEntityState(id: string, integrationId: string, player: MaPlayer): EntityState {
  const media = player.current_media ?? undefined;
  return {
    ref: formatEntityRef(integrationId, id),
    state: player.available === false ? 'unavailable' : (player.playback_state ?? 'unknown'),
    attributes: {
      // Named like Home Assistant's `media_player` attributes so `usePlayer`/`MediaPlayerBar`
      // (in @hash/ui) work unmodified against either backend.
      media_title: media?.title ?? undefined,
      media_artist: media?.artist ?? undefined,
      media_album_name: media?.album ?? undefined,
      entity_picture: media?.image_url ?? undefined,
      volume_level: typeof player.volume_level === 'number' ? player.volume_level / 100 : undefined,
      is_volume_muted: player.volume_muted ?? undefined,
    },
  };
}

/** Maps a generic `media_player` service call onto a Music Assistant `players/cmd/*` command. */
function commandFor(
  service: string,
  data: ServiceCall['data'],
): { command: string; args?: Record<string, unknown> } {
  switch (service) {
    case 'media_play':
      return { command: 'players/cmd/play' };
    case 'media_pause':
      return { command: 'players/cmd/pause' };
    case 'media_play_pause':
      return { command: 'players/cmd/play_pause' };
    case 'media_next_track':
      return { command: 'players/cmd/next' };
    case 'media_previous_track':
      return { command: 'players/cmd/previous' };
    case 'volume_set': {
      const level = data?.volume_level;
      if (typeof level !== 'number') throw new Error('volume_set needs a numeric volume_level');
      return { command: 'players/cmd/volume_set', args: { volume_level: Math.round(level * 100) } };
    }
    case 'volume_mute':
      return {
        command: 'players/cmd/volume_mute',
        args: { muted: data?.is_volume_muted === true },
      };
    default:
      throw new Error(`Music Assistant does not support the "${service}" service`);
  }
}

function wsUrl(url: string): string {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/ws`;
  return parsed.toString();
}

export class MusicAssistantIntegration extends BaseIntegration {
  readonly id: string;
  #options: MusicAssistantOptions;
  #socket: WebSocket | undefined;
  #nextMessageId = 1;
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
    if (!this.#stopped) return Promise.resolve();
    this.#stopped = false;
    this.setStatus('connecting');
    return this.#open();
  }

  disconnect(): void {
    this.#stopped = true;
    clearTimeout(this.#timer);
    for (const { reject } of this.#pending.values()) reject(new Error('Disconnected'));
    this.#pending.clear();
    this.#socket?.close();
    this.#socket = undefined;
    this.setStatus('disconnected');
  }

  async callService(call: ServiceCall): Promise<void> {
    if (call.domain !== 'media_player') {
      throw new Error(
        `Music Assistant only supports the "media_player" domain, got "${call.domain}"`,
      );
    }
    const playerId = call.entityIds?.[0];
    if (!playerId) throw new Error('Music Assistant service calls need a target player');
    const { command, args } = commandFor(call.service, call.data);
    await this.#send(command, { player_id: playerId, ...args });
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
        if (this.#socket !== socket) return;
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
          if (!this.#stopped) this.#scheduleReconnect();
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
      if (this.#stopped) return;
      this.setStatus('connecting');
      this.#open().catch(() => this.#scheduleReconnect());
    }, delay);
  }

  async #authenticateAndLoad(): Promise<void> {
    await this.#send('auth', { token: this.#options.token });
    const players = await this.#send('players/all', {});
    const next = new Map<string, EntityState>();
    if (Array.isArray(players)) {
      for (const player of players) {
        if (isMaPlayer(player))
          next.set(player.player_id, toEntityState(player.player_id, this.id, player));
      }
    }
    this.replaceStates(next);
  }

  #send(command: string, args: Record<string, unknown>): Promise<unknown> {
    const socket = this.#socket;
    if (!socket) return Promise.reject(new Error('Not connected'));
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
    if (!isRecord(message)) return;

    if (typeof message.event === 'string') {
      this.#handleEvent(message.event, message.object_id, message.data);
      return;
    }
    if (typeof message.message_id !== 'string') return;
    const pending = this.#pending.get(message.message_id);
    if (!pending) return;
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
        if (isMaPlayer(data))
          this.setState(data.player_id, toEntityState(data.player_id, this.id, data));
        return;
      case 'player_removed':
        if (typeof objectId === 'string') this.setState(objectId, undefined);
        return;
      default:
        return;
    }
  }
}

/** Convenience for `hash.config.ts`: builds a `MusicAssistantIntegration` from `MA_URL`/`MA_TOKEN`
 * if both are set, `undefined` otherwise. Not required — construct `MusicAssistantIntegration`
 * directly for anything more specific (a custom `id`, a non-env source for the token, ...). */
export function musicAssistantFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MusicAssistantIntegration | undefined {
  return env.MA_URL && env.MA_TOKEN
    ? new MusicAssistantIntegration({ url: env.MA_URL, token: env.MA_TOKEN })
    : undefined;
}
