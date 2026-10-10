import { useEffect, useSyncExternalStore } from 'react';
import type { EntityRef } from '@hashsome/core';
import { useEntity } from '../hooks.ts';

/** Something asked of a player that has not taken effect yet. Starting an album or a playlist can take
 * the player many seconds after it has acknowledged the request, a skip a few, and nothing on screen
 * changes until it does: so the button, the item and the player say it is waiting. */
export interface MediaPending {
  /** What was asked. A transport command is its own name (`togglePlay`, `next`, `previous`, `setShuffle`);
   * from the library: `playItem` (replaces what is playing, so the player says it is loading it), `queueNext`, `queueAdd`;
   * and a change of who plays together starts with `group:` (`group:add:<speaker>`, `group:reset`...), which is done
   * when the player's group changes. */
  kind: string;

  /** For the library kinds: the item it was asked for. */
  item?: string;

  /** What to call it while it loads: the item's title. */
  label?: string;
}

interface Waiting {
  entry: MediaPending;

  /** Set once the player has acknowledged the request: from then on it is waiting for the player to change. */
  answered: boolean;

  /** Ends the wait once the player has changed; set when it has acknowledged the request. */
  release?: (() => void) | undefined;

  /** The track the player had when this was asked: a skip is done when there is another one and it plays. */
  baseTitle?: string | undefined;

  /** The group the player was in when this was asked: a change of the group is done when it is another. */
  baseGroup?: string | undefined;

  /** The player changed before it acknowledged (a player that changes first and answers after). */
  changed?: boolean;
}

/** Asked and not in effect yet, for each player by ref. A new array each time it changes, which is
 * what `useSyncExternalStore` compares. */
const pending = new Map<string, Waiting[]>();
const view = new Map<string, MediaPending[]>();
const listeners = new Set<() => void>();
const NONE: MediaPending[] = [];

/** The most a request is shown as pending: a backend that never answers must not leave a ring for good. */
export const PENDING_LIMIT_MS = 60_000;

/** What a player is doing as last seen, to tell what a request was made against. */
interface Seen {
  title: string | undefined;

  /** The group it plays in, as text, empty while it plays alone. */
  group: string;

  /** Playing, and past the start of the track: not only announced. */
  started: boolean;
}

const lastSeen = new Map<string, Seen>();

/** Asks that change the track are done when another track plays, and not when it is only announced. */
const changesTrack = (kind: string) =>
  kind === 'next' || kind === 'previous' || kind === 'playItem';

/** How long after the player acknowledges a request to wait for it to take effect, when it never
 * visibly does (a skip back on a track already at its start). A skip or a start from the library
 * takes the player several seconds. */
const settleFor = (kind: string) =>
  kind === 'playItem'
    ? 15_000
    : kind === 'next'
      ? 10_000
      : kind === 'previous'
        ? 4_000
        : changesGroup(kind)
          ? 8_000
          : 2_000;

/** Asks that change who plays together are done when the group is another. */
const changesGroup = (kind: string) => kind.startsWith('group:');

/** A position past this many seconds means the track plays, and is not only announced. */
const STARTED_AFTER_S = 0.05;

/** At least this long is shown for a request, so a quick answer still shows a turn. */
const MIN_SHOWN_MS = 600;

const publish = (ref: string) => {
  const list = pending.get(ref) ?? [];
  if (list.length > 0) {
    view.set(
      ref,
      list.map((waiting) => waiting.entry),
    );
  } else {
    view.delete(ref);
  }

  for (const listener of listeners) {
    listener();
  }
};

/** Shows `entry` as pending for `ref` from now until the player has taken it up, whichever way: until it
 * refuses it, or changes after acknowledging it, or a while after (`useMediaPending` reports the change). */
export function trackMedia(ref: string, entry: MediaPending, request: Promise<unknown>): void {
  const waiting: Waiting = {
    entry,
    answered: false,
    baseTitle: lastSeen.get(ref)?.title,
    baseGroup: lastSeen.get(ref)?.group,
  };

  const started = Date.now();
  pending.set(ref, [...(pending.get(ref) ?? []), waiting]);
  publish(ref);

  const timers = new Set<ReturnType<typeof setTimeout>>();
  const finish = () => {
    for (const timer of timers) {
      clearTimeout(timer);
    }

    const rest = (pending.get(ref) ?? []).filter((other) => other !== waiting);
    if (rest.length > 0) {
      pending.set(ref, rest);
    } else {
      pending.delete(ref);
    }

    publish(ref);
  };

  timers.add(setTimeout(finish, PENDING_LIMIT_MS));
  request.then(() => {
    const shown = Date.now() - started;
    const settle = settleFor(entry.kind);
    waiting.answered = true;

    const taken = () => {
      // The player changed: done, once it has been shown for long enough.
      timers.add(setTimeout(finish, Math.max(0, MIN_SHOWN_MS - (Date.now() - started))));
    };

    waiting.release = taken;

    timers.add(setTimeout(finish, Math.max(settle, MIN_SHOWN_MS - shown)));
    if (waiting.changed) {
      taken();
    }
  }, finish);
}

/** The player changed: what it has acknowledged is now in effect, once it is as far as each ask needs. */
function observe(ref: EntityRef, seen: Seen): void {
  lastSeen.set(ref, seen);
  for (const waiting of pending.get(ref) ?? []) {
    const done = changesGroup(waiting.entry.kind)
      ? seen.group !== waiting.baseGroup
      : !changesTrack(waiting.entry.kind) || (seen.title !== waiting.baseTitle && seen.started);

    if (!done) {
      continue;
    }

    if (waiting.answered) {
      waiting.release?.();
      waiting.release = undefined;
    } else {
      waiting.changed = true;
    }
  }
}

/** Forgets everything pending: for tests, which share this module between them. */
export function resetMediaPending(): void {
  pending.clear();
  view.clear();
  lastSeen.clear();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** What is being asked of a player and has not taken effect yet: for a ring on the button, a spinner on
 * the item, and a "loading" line on the player. Also watches the player for the change that ends the
 * wait: a different track, play or pause, shuffle. */
export function useMediaPending(ref: EntityRef | undefined): MediaPending[] {
  const player = useEntity(ref);
  const media = player?.kind === 'mediaPlayer' ? player : undefined;
  const present = media !== undefined;
  const title = media?.media?.title;
  const started = media?.playback === 'playing' && (media.position ?? 0) >= STARTED_AFTER_S;
  // Anything else the player does (play or pause, shuffle, another album) ends what was asked of it too.
  const playback = media?.playback;
  const album = media?.media?.album;
  const shuffle = media?.shuffle;
  // Who plays together, as one text: it changes when someone joins or leaves, whoever leads.
  const group = media?.group ? `${media.group.leader}>${media.group.members.join(',')}` : '';

  useEffect(() => {
    if (ref && present) {
      observe(ref, { title, started, group });
    }
    // `playback`, `album` and `shuffle` are not read inside: a change to any of them is the reason to look again.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [ref, present, title, started, group, playback, album, shuffle]);

  return useSyncExternalStore(
    subscribe,
    () => (ref ? (view.get(ref) ?? NONE) : NONE),
    () => NONE,
  );
}
