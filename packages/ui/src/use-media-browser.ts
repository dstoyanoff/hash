import type { BrowseItem, EntityRef } from '@hashsome/core';
import { useCallback, useEffect, useState } from 'react';
import { useReconnects } from './hooks.ts';
import { useClient } from './provider.tsx';

interface Level {
  /** The item that was opened to get here; `undefined` for the top level. */
  path?: string;
  title?: string;
  item?: BrowseItem;
}

interface Answer {
  key: string;
  items: BrowseItem[];
  title?: string;
  error?: string;
}

export interface MediaBrowserState {
  /** What is listed now. */
  items: BrowseItem[];

  /** Which list that is: it changes when another one is shown (another tab, an album opened, a search), so a view can tell the same list updating from a new one arriving. */
  listKey: string;

  /** A name for the list: the opened folder's, or what was searched for. Absent on a tab. */
  title: string | undefined;
  loading: boolean;
  error: string | undefined;

  /** The top level's shelves (Playlists, Albums, ...), when it is a set of folders to switch
   * between. They are shown as tabs instead of a list of folders to open, and stay in view while
   * something inside a shelf is open or a search is showing. */
  tabs: BrowseItem[] | undefined;

  /** The open tab; none while a search is showing, since its results belong to no shelf. */
  activeTab: string | undefined;

  /** Goes to a shelf: leaves whatever was open inside one, and any search. */
  selectTab(id: string): void;

  /** The album, playlist or artist that is open: what a "play all" would play, and what the tracks in the list belong to. Absent at the top, on a shelf and in search results. */
  inside: BrowseItem | undefined;

  /** Opened a folder (or searching), so there is somewhere to go back to. */
  canGoBack: boolean;
  searching: boolean;
  open(item: BrowseItem): void;
  back(): void;

  /** What is typed in the search box. */
  query: string;

  /** Lists what matches `text`; an empty string goes back to where the browser was. */
  search(text: string): void;
}

/** A top level that is nothing but folders to look inside is a set of shelves, which read better
 * as tabs than as a list that always looks the same. */
const isShelves = (items: BrowseItem[]) =>
  items.length >= 2 && items.every((item) => item.expandable && !item.playable);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Walks a player's own media library through the runtime. The top level is read once: shelves
 * become tabs (the first is open to begin with), anything else is a plain list. Below it, a stack
 * of opened folders; apart from it, an optional search, and clearing the search returns to where
 * the browser was. */
export function useMediaBrowser(ref: EntityRef): MediaBrowserState {
  const client = useClient();
  // A level that could not be read because the connection was not there is asked for again when it is.
  const reconnects = useReconnects();
  const [trail, setTrail] = useState<Level[]>([{}]);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<string | undefined>();
  // Answers are kept with the request they answer, so a stale one is never shown for a new one.
  const [top, setTop] = useState<Answer | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    let current = true;
    client.browse(ref, {}).then(
      (level) => current && setTop({ key: 'top', ...level }),
      (error: unknown) => current && setTop({ key: 'top', items: [], error: messageOf(error) }),
    );

    return () => {
      current = false;
    };
    // `reconnects` is not read inside: the connection coming back is the reason to ask again.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [client, ref, reconnects]);

  const needle = text.trim();
  const searching = needle !== '';
  const here = trail.at(-1) ?? {};
  const atTop = trail.length === 1;
  const tabs = top && !top.error && isShelves(top.items) ? top.items : undefined;
  const selected = tabs ? (tabs.find((item) => item.id === tab) ?? tabs[0])?.id : undefined;

  // What to ask for, if anything: a search, a folder, or the open tab. A top level that is not
  // shelves is already in hand.
  const path = atTop ? selected : here.path;
  const key = searching ? `search:${needle}` : `path:${path ?? ''}`;
  const result = answer?.key === key ? answer : null;

  useEffect(() => {
    const request = searching ? { search: needle } : path === undefined ? undefined : { path };
    if (!request) {
      return;
    }

    let current = true;
    const timer = setTimeout(
      () => {
        client.browse(ref, request).then(
          (level) => current && setAnswer({ key, ...level }),
          (error: unknown) => current && setAnswer({ key, items: [], error: messageOf(error) }),
        );
      },
      // Typing in the search box waits for a pause; opening a folder or a tab does not.
      searching ? 300 : 0,
    );

    return () => {
      current = false;
      clearTimeout(timer);
    };
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [client, ref, key, searching, needle, path, reconnects]);

  const open = useCallback(
    (item: BrowseItem) =>
      setTrail((levels) => [...levels, { path: item.id, title: item.title, item }]),
    [],
  );

  const selectTab = useCallback((id: string) => {
    setTab(id);
    setText('');
    setTrail([{}]);
  }, []);

  const back = useCallback(() => {
    if (text.trim() !== '') {
      setText('');
      return;
    }

    setTrail((levels) => (levels.length > 1 ? levels.slice(0, -1) : levels));
  }, [text]);

  // The plain top-level list, when there are no shelves to make tabs of.
  const listing = !searching && atTop && !tabs ? top : result;
  return {
    items: listing?.items ?? [],
    listKey: searching ? 'search' : `path:${path ?? 'top'}`,
    title: searching
      ? (result?.title ?? `Results for “${needle}”`)
      : atTop
        ? undefined
        : (result?.title ?? here.title),
    loading: listing === null,
    error: listing?.error,
    tabs,
    activeTab: searching ? undefined : selected,
    selectTab,
    inside: searching || atTop ? undefined : here.item,
    canGoBack: searching || !atTop,
    searching,
    open,
    back,
    query: text,
    search: setText,
  };
}
