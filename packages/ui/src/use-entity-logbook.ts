import type { Client, EntityRef, LogbookEntry } from '@hashsome/core';
import { useEffect, useState } from 'react';
import { useClient } from './provider.tsx';

export interface EntityLogbookState {
  /** `undefined` until the first answer, and always for a backend that keeps no activity. */
  entries: LogbookEntry[] | undefined;
  loading: boolean;
}

/** How long an answer is reused: closing and reopening a drawer does not ask again. */
const FRESH_MS = 30_000;

/** How many entries a drawer's History section lists. */
const LIMIT = 6;

const cache = new WeakMap<Client, Map<string, { at: number; entries: Promise<LogbookEntry[]> }>>();

function load(client: Client, ref: EntityRef): Promise<LogbookEntry[]> {
  const answers = cache.get(client) ?? new Map();
  cache.set(client, answers);
  const known = answers.get(ref);
  if (known && Date.now() - known.at < FRESH_MS) {
    return known.entries;
  }

  const entries = client.logbook(ref, { limit: LIMIT }).then((result) => result.entries);
  answers.set(ref, { at: Date.now(), entries });
  // A failed answer is not worth keeping: the next ask tries again.
  entries.catch(() => answers.delete(ref));
  return entries;
}

/**
 * What happened to an entity lately and who or what caused it, from the backend's own record,
 * fetched when `ref` changes and kept for half a minute. A backend that keeps no activity, or an
 * error, leaves `entries` undefined: activity is an extra, so a component just shows nothing. Pass
 * `undefined` to not ask at all.
 */
export function useEntityLogbook(ref: EntityRef | undefined): EntityLogbookState {
  const client = useClient();
  const [state, setState] = useState<{ ref: string; entries: LogbookEntry[] | undefined }>();

  useEffect(() => {
    if (!ref) {
      return;
    }

    let current = true;
    load(client, ref).then(
      (entries) => current && setState({ ref, entries }),
      () => current && setState({ ref, entries: undefined }),
    );

    return () => {
      current = false;
    };
  }, [client, ref]);

  const answered = state !== undefined && state.ref === ref;
  return { entries: answered ? state.entries : undefined, loading: ref !== undefined && !answered };
}
