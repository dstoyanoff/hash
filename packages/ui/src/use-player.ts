import type { EntityRef } from '@hash/core';
import { useMemo } from 'react';
import { useEntity, useService } from './hooks.ts';
import { entityStatus, numberAttr, stringAttr, type EntityStatus } from './status.ts';

export type PlayerState = 'playing' | 'paused' | 'idle' | 'off' | 'buffering' | 'other';

export interface Player {
  status: EntityStatus;
  state: PlayerState;
  title: string | undefined;
  artist: string | undefined;
  album: string | undefined;
  /** Absolute or origin-relative image URL, if the player reports one. */
  artworkUrl: string | undefined;
  /** 0..1 */
  volume: number | undefined;
  muted: boolean;
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlay(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  setVolume(volume: number): Promise<void>;
  toggleMute(): Promise<void>;
}

const playerStates: Record<string, PlayerState> = {
  playing: 'playing',
  paused: 'paused',
  idle: 'idle',
  standby: 'idle',
  off: 'off',
  buffering: 'buffering',
};

/** Reads and controls a `media_player` entity (Home Assistant, or Music Assistant via HA). */
export function usePlayer(ref: EntityRef): Player {
  const entity = useEntity(ref);
  const call = useService(ref);

  return useMemo<Player>(
    () => ({
      status: entityStatus(entity),
      state: entity ? (playerStates[entity.state] ?? 'other') : 'other',
      title: stringAttr(entity, 'media_title'),
      artist: stringAttr(entity, 'media_artist'),
      album: stringAttr(entity, 'media_album_name'),
      artworkUrl:
        stringAttr(entity, 'entity_picture_local') ?? stringAttr(entity, 'entity_picture'),
      volume: numberAttr(entity, 'volume_level'),
      muted: entity?.attributes.is_volume_muted === true,
      play: () => call('media_player', 'media_play'),
      pause: () => call('media_player', 'media_pause'),
      togglePlay: () => call('media_player', 'media_play_pause'),
      next: () => call('media_player', 'media_next_track'),
      previous: () => call('media_player', 'media_previous_track'),
      setVolume: (volume) => call('media_player', 'volume_set', { volume_level: volume }),
      toggleMute: () =>
        call('media_player', 'volume_mute', {
          is_volume_muted: !(entity?.attributes.is_volume_muted === true),
        }),
    }),
    [entity, call],
  );
}
