/** What a browsable item is, so the UI can pick an icon and a layout. Open set: anything an
 * integration cannot place is `other`. */
export type BrowseKind = 'folder' | 'artist' | 'album' | 'playlist' | 'track' | 'radio' | 'other';

/** One entry in a media library, as the UI shows it. The `id` is opaque: only the integration that
 * produced it can read it, and it is what goes back to `browse` (to open it) or `playMedia` (to
 * play it). */
export interface BrowseItem {
  id: string;
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  kind: BrowseKind;

  /** `playMedia` accepts this item. */
  playable: boolean;

  /** `browse` can open this item to list what is inside it. */
  expandable: boolean;
}

export interface BrowseQuery {
  /** The `id` of an expandable item to open. Omit for the top level. */
  path?: string;

  /** Finds items by name. Only for integrations whose player has `capabilities.search`. */
  search?: string;
}

export interface BrowseResult {
  /** A heading for what is listed, when the backend names it (a playlist's name). */
  title?: string;
  items: BrowseItem[];
}
