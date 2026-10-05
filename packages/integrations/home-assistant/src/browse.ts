import type { BrowseItem, BrowseKind } from '@hash/core';
import { fileUrl } from './mappers/common.ts';

/** One entry of Home Assistant's `BrowseMedia` tree, as `media_player/browse_media` returns it. */
export interface HaBrowseMedia {
  title: string;
  media_class: string;
  media_content_type: string;
  media_content_id: string;
  can_play: boolean;
  can_expand: boolean;
  thumbnail?: string | null;
  children?: HaBrowseMedia[] | null;
}

const SEPARATOR = '|';

/** An item's id carries what Home Assistant needs to open or play it: its content type and id. */
export function encodeItemId(contentType: string, contentId: string): string {
  return `${encodeURIComponent(contentType)}${SEPARATOR}${encodeURIComponent(contentId)}`;
}

export function decodeItemId(id: string): { contentType: string; contentId: string } {
  const at = id.indexOf(SEPARATOR);
  if (at < 0) {
    throw new Error(`"${id}" is not a media item`);
  }

  try {
    return {
      contentType: decodeURIComponent(id.slice(0, at)),
      contentId: decodeURIComponent(id.slice(at + 1)),
    };
  } catch {
    throw new Error(`"${id}" is not a media item`);
  }
}

const KINDS: Record<string, BrowseKind> = {
  album: 'album',
  artist: 'artist',
  playlist: 'playlist',
  track: 'track',
  music: 'track',
  podcast: 'folder',
  channel: 'radio',
  directory: 'folder',
};

export function toBrowseItem(
  media: HaBrowseMedia,
  toAssetUrl: (path: string) => string = (path) => path,
): BrowseItem {
  const kind = KINDS[media.media_class] ?? (media.can_expand ? 'folder' : 'other');
  // Thumbnails Home Assistant serves itself are relative and need its login, so they go through
  // the runtime; full addresses are passed on as they are.
  const artwork = media.thumbnail ? fileUrl(media.thumbnail, toAssetUrl) : '';
  return {
    id: encodeItemId(media.media_content_type, media.media_content_id),
    title: media.title,
    kind,
    playable: media.can_play,
    expandable: media.can_expand,
    ...(artwork ? { artworkUrl: artwork } : {}),
  };
}
