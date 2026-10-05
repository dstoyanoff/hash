import type { EntityBase } from './base.ts';

export type PlaybackState = 'playing' | 'paused' | 'idle' | 'off' | 'buffering';

export interface MediaPlayerEntity extends EntityBase<'mediaPlayer'> {
  playback: PlaybackState;
  media?: { title?: string; artist?: string; album?: string; artworkUrl?: string };

  /** Where playback is in the current item, in seconds, as of `positionUpdatedAt`. A player that
   * is playing advances from there, so a UI interpolates instead of waiting for updates. */
  position?: number;

  /** Length of the current item, in seconds. Absent for a stream with no end. */
  duration?: number;

  /** ISO 8601: when `position` was true. */
  positionUpdatedAt?: string;

  /** Whether the player plays its queue in a random order. Absent when the player has no shuffle. */
  shuffle?: boolean;

  /** 0..1. Absent when the player has no volume control. */
  volume?: number;
  muted: boolean;
  capabilities: {
    volume: boolean;
    mute: boolean;
    next: boolean;
    previous: boolean;

    /** Has a browsable library (`Integration.browse`). */
    browse: boolean;

    /** The library can be searched (`BrowseQuery.search`). */
    search: boolean;

    /** Playback can be moved to a position (`seek`). */
    seek: boolean;

    /** Shuffle can be turned on and off (`setShuffle`). */
    shuffle: boolean;

    /** Playback can be moved to another player. */
    transfer: boolean;

    /** Can be grouped with other players. */
    group: boolean;
  };
}

export interface MediaPlayerCommands {
  play: void;
  pause: void;
  togglePlay: void;
  next: void;
  previous: void;

  /** `volume` is 0..1. */
  setVolume: { volume: number };
  setMuted: { muted: boolean };

  /** `position` is in seconds. */
  seek: { position: number };
  setShuffle: { shuffle: boolean };

  /** Plays a `BrowseItem` from this player's own library: `item` is its `id`. `mode` defaults to
   * `play`: start it now. `replace` clears the queue first, `next` and `add` queue it. */
  playMedia: { item: string; mode?: 'play' | 'replace' | 'next' | 'add' };
}
