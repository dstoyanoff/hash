import type { Client, EntityRef, HistoryQuery, HistoryResult } from '@hash/core';
import { useEffect, useState } from 'react';
import { useClient } from './provider.tsx';

export interface EntityHistoryState {
  /** `undefined` until the first answer, and always for a backend that keeps no history. */
  result: HistoryResult | undefined;
  loading: boolean;
}

/** How long an answer is reused: opening a drawer twice, or switching a range back, does not ask again. */
const FRESH_MS = 60_000;

const cache = new WeakMap<Client, Map<string, { at: number; result: Promise<HistoryResult> }>>();

function load(client: Client, ref: EntityRef, query: HistoryQuery): Promise<HistoryResult> {
  const answers = cache.get(client) ?? new Map();
  cache.set(client, answers);
  const key = `${ref}|${query.range}|${query.bucket ?? ''}`;
  const known = answers.get(key);
  if (known && Date.now() - known.at < FRESH_MS) {
    return known.result;
  }

  const result = client.history(ref, query);
  answers.set(key, { at: Date.now(), result });
  // A failed answer is not worth keeping: the next ask tries again.
  result.catch(() => answers.delete(key));
  return result;
}

/**
 * An entity's past values from the backend's own record, fetched when `ref` or `query` change and
 * kept for a minute. A backend that keeps no history, or an error, leaves `result` undefined —
 * history is an extra, so a component just shows nothing. Pass `undefined` to not ask at all.
 */
export function useEntityHistory(
  ref: EntityRef | undefined,
  query: HistoryQuery | undefined,
): EntityHistoryState {
  const client = useClient();
  const range = query?.range;
  const bucket = query?.bucket;
  const [state, setState] = useState<{ key: string; result: HistoryResult | undefined }>();
  const key = ref && range ? `${ref}|${range}|${bucket ?? ''}` : undefined;

  useEffect(() => {
    if (!ref || !range || !key) {
      return;
    }

    let current = true;
    load(client, ref, { range, ...(bucket ? { bucket } : {}) }).then(
      (result) => current && setState({ key, result }),
      () => current && setState({ key, result: undefined }),
    );

    return () => {
      current = false;
    };
  }, [client, ref, range, bucket, key]);

  const answered = state !== undefined && state.key === key;
  return { result: answered ? state.result : undefined, loading: key !== undefined && !answered };
}
