import type { Client, EntityRef, ForecastResult, ForecastType } from '@hashsome/core';
import { useEffect, useState } from 'react';
import { useReconnects } from './hooks.ts';
import { useClient } from './provider.tsx';

export interface WeatherForecastState {
  /** `undefined` until the first answer, and always for a source that has no forecasts. */
  result: ForecastResult | undefined;
  loading: boolean;
}

/** How long an answer is reused: a forecast changes every half hour or so at most. */
const FRESH_MS = 10 * 60_000;

const cache = new WeakMap<Client, Map<string, { at: number; result: Promise<ForecastResult> }>>();

function load(client: Client, ref: EntityRef, type: ForecastType): Promise<ForecastResult> {
  const answers = cache.get(client) ?? new Map();
  cache.set(client, answers);
  const key = `${ref}|${type}`;
  const known = answers.get(key);
  if (known && Date.now() - known.at < FRESH_MS) {
    return known.result;
  }

  const result = client.forecast(ref, { type });
  answers.set(key, { at: Date.now(), result });
  // A failed answer is not worth keeping: the next ask tries again.
  result.catch(() => answers.delete(key));
  return result;
}

/**
 * A weather entity's forecast of one kind, fetched when `ref` or `type` change and kept for ten
 * minutes. A source with no forecasts, or an error, leaves `result` undefined: a forecast is an
 * extra, so a component just shows nothing. Pass `undefined` to not ask at all.
 */
export function useWeatherForecast(
  ref: EntityRef | undefined,
  type: ForecastType,
): WeatherForecastState {
  const client = useClient();
  const reconnects = useReconnects();
  const [state, setState] = useState<{ key: string; result: ForecastResult | undefined }>();
  const key = ref ? `${ref}|${type}` : undefined;

  useEffect(() => {
    if (!ref || !key) {
      return;
    }

    let current = true;
    load(client, ref, type).then(
      (result) => current && setState({ key, result }),
      () => current && setState({ key, result: undefined }),
    );

    return () => {
      current = false;
    };
    // `reconnects` is not read inside: the connection coming back is the reason to ask again.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [client, ref, type, key, reconnects]);

  const answered = state !== undefined && state.key === key;
  return { result: answered ? state.result : undefined, loading: key !== undefined && !answered };
}
