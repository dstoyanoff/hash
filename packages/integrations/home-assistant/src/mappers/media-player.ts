import type { EntityInput, PlaybackState } from '@hashsome/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { baseOf, fileUrl, num, str } from './common.ts';

/** `MediaPlayerEntityFeature` bit flags from Home Assistant. */
const FEATURE = {
  seek: 2,
  volumeSet: 4,
  volumeMute: 8,
  previous: 16,
  next: 32,
  shuffle: 32768,
  browse: 131072,
} as const;

const PLAYBACK: Record<string, PlaybackState> = {
  playing: 'playing',
  paused: 'paused',
  idle: 'idle',
  standby: 'idle',
  on: 'idle',
  off: 'off',
  buffering: 'buffering',
};

export function mapMediaPlayer(
  entity: HassEntity,
  toAssetUrl: (path: string) => string = (path) => path,
): EntityInput {
  const a = entity.attributes;
  const features = num(a.supported_features);
  const has = (flag: number, fallback: boolean) =>
    features === undefined ? fallback : (features & flag) !== 0;

  const volume = num(a.volume_level);
  const title = str(a.media_title);
  const artist = str(a.media_artist);
  const album = str(a.media_album_name);
  const picture = str(a.entity_picture_local) ?? str(a.entity_picture);
  const artworkUrl = picture ? fileUrl(picture, toAssetUrl) : undefined;
  const position = num(a.media_position);
  const duration = num(a.media_duration);
  const positionUpdatedAt = str(a.media_position_updated_at);
  const shuffle = typeof a.shuffle === 'boolean' ? a.shuffle : undefined;
  return {
    kind: 'mediaPlayer',
    ...baseOf(entity),
    playback: PLAYBACK[entity.state] ?? 'idle',
    muted: a.is_volume_muted === true,
    ...(volume !== undefined ? { volume } : {}),
    ...(title || artist || album || artworkUrl
      ? {
          media: {
            ...(title ? { title } : {}),
            ...(artist ? { artist } : {}),
            ...(album ? { album } : {}),
            ...(artworkUrl ? { artworkUrl } : {}),
          },
        }
      : {}),
    ...(shuffle !== undefined ? { shuffle } : {}),
    ...(position !== undefined ? { position } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(position !== undefined && positionUpdatedAt ? { positionUpdatedAt } : {}),
    capabilities: {
      volume: volume !== undefined || has(FEATURE.volumeSet, false),
      mute: a.is_volume_muted !== undefined || has(FEATURE.volumeMute, false),
      next: has(FEATURE.next, true),
      previous: has(FEATURE.previous, true),
      browse: has(FEATURE.browse, false),
      // Home Assistant's browse contract has no search.
      search: false,
      seek: has(FEATURE.seek, false),
      shuffle: has(FEATURE.shuffle, false),
      transfer: false,
      group: false,
    },
  };
}
