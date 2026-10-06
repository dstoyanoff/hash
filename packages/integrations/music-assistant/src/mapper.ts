import type { EntityInput } from '@hashsome/core';

export interface MaPlayerMedia {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  image_url?: string | null;
  duration?: number | null;
}

export interface MaPlayer {
  player_id: string;
  display_name?: string | null;
  name?: string | null;
  available?: boolean;
  playback_state?: string;
  volume_level?: number | null;
  volume_muted?: boolean | null;
  current_media?: MaPlayerMedia | null;

  /** The queue's shuffle setting, which Music Assistant keeps on the queue, not on the player: the
   * integration copies it onto the player it belongs to. */
  shuffle_enabled?: boolean | null;

  /** Seconds into the current item, as of `elapsed_time_last_updated` (a UTC epoch in seconds). */
  elapsed_time?: number | null;
  elapsed_time_last_updated?: number | null;
}

const PLAYBACK: Record<string, 'playing' | 'paused' | 'idle' | 'buffering'> = {
  playing: 'playing',
  paused: 'paused',
  idle: 'idle',
  buffering: 'buffering',
};

/** Maps a Music Assistant player to the generic `mediaPlayer` entity (everything but `ref`). */
export function toMediaPlayer(player: MaPlayer): EntityInput {
  const media = player.current_media ?? undefined;
  const available = player.available !== false;
  return {
    kind: 'mediaPlayer',
    name: player.display_name ?? player.name ?? player.player_id,
    availability: available ? 'ready' : 'unavailable',
    playback: available ? (PLAYBACK[player.playback_state ?? ''] ?? 'idle') : 'off',
    muted: player.volume_muted === true,
    ...(typeof player.volume_level === 'number' ? { volume: player.volume_level / 100 } : {}),
    ...(media
      ? {
          media: {
            ...(media.title ? { title: media.title } : {}),
            ...(media.artist ? { artist: media.artist } : {}),
            ...(media.album ? { album: media.album } : {}),
            ...(media.image_url ? { artworkUrl: media.image_url } : {}),
          },
        }
      : {}),
    ...(typeof player.shuffle_enabled === 'boolean' ? { shuffle: player.shuffle_enabled } : {}),
    ...(typeof player.elapsed_time === 'number' &&
    typeof player.elapsed_time_last_updated === 'number'
      ? {
          position: player.elapsed_time,
          positionUpdatedAt: new Date(player.elapsed_time_last_updated * 1000).toISOString(),
        }
      : {}),
    ...(typeof media?.duration === 'number' ? { duration: media.duration } : {}),
    capabilities: {
      volume: typeof player.volume_level === 'number',
      mute: typeof player.volume_muted === 'boolean',
      next: true,
      previous: true,
      browse: true,
      search: true,
      seek: true,
      shuffle: true,
      queue: true,
      transfer: false,
      group: false,
    },
  };
}
