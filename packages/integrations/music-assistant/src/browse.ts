import type { BrowseItem, BrowseKind } from '@hashsome/core';

/** The fields of a Music Assistant media item that a library list needs. Items come back as plain
 * JSON; anything missing is simply left out of the result. */
export interface MaItem {
  uri?: string;
  name?: string;
  media_type?: string;
  artists?: { name?: string }[] | null;
  artist_str?: string | null;
  owner?: string | null;
  image?: MaImage | null;
  metadata?: { images?: MaImage[] | null } | null;
}

interface MaImage {
  path?: string;
  remotely_accessible?: boolean;
}

/** The top level: a shelf per way into the library. Their ids are not Music Assistant uris. */
export const SHELVES: { id: string; title: string; kind: BrowseKind }[] = [
  { id: 'shelf:recent', title: 'Recently played', kind: 'folder' },
  { id: 'shelf:playlists', title: 'Playlists', kind: 'folder' },
  { id: 'shelf:albums', title: 'Albums', kind: 'folder' },
  { id: 'shelf:artists', title: 'Artists', kind: 'folder' },
  { id: 'shelf:radio', title: 'Radio', kind: 'folder' },
];

/** The kinds a media type maps to; the others are `other` and cannot be opened. */
const KINDS: Record<string, BrowseKind> = {
  album: 'album',
  artist: 'artist',
  playlist: 'playlist',
  track: 'track',
  radio: 'radio',
};

const EXPANDABLE = new Set(['album', 'artist', 'playlist']);

export function toBrowseItem(item: MaItem): BrowseItem | undefined {
  if (typeof item.uri !== 'string' || typeof item.name !== 'string') {
    return undefined;
  }

  const type = item.media_type ?? '';
  const subtitle = item.artist_str ?? item.artists?.[0]?.name ?? item.owner ?? undefined;
  const artwork = artworkOf(item);
  return {
    id: item.uri,
    title: item.name,
    kind: KINDS[type] ?? 'other',
    playable: type in KINDS,
    expandable: EXPANDABLE.has(type),
    ...(subtitle ? { subtitle } : {}),
    ...(artwork ? { artworkUrl: artwork } : {}),
  };
}

/** Pictures Music Assistant serves itself need its login, so only ones the browser can open on its
 * own (a streaming service's CDN) are passed on. */
export function artworkOf(item: MaItem): string | undefined {
  const image = item.image ?? item.metadata?.images?.[0];
  return image?.remotely_accessible && image.path && /^https?:\/\//.test(image.path)
    ? image.path
    : undefined;
}

/** `library://album/12` -> where to ask for what is inside it. */
export function parseUri(uri: string): { provider: string; type: string; id: string } {
  const match = /^([^:]+):\/\/([^/]+)\/(.+)$/.exec(uri);
  if (!match) {
    throw new Error(`"${uri}" is not a media item`);
  }

  return { provider: match[1]!, type: match[2]!, id: match[3]! };
}
