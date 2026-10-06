import { VERSION_PATH } from '../src/build-id.ts';

declare const HASHSOME_BUILD_ID: string | undefined;

/** The id of the build this page came from; undefined in dev, where nothing is watched. */
export const PAGE_BUILD_ID: string | undefined =
  typeof HASHSOME_BUILD_ID === 'undefined' ? undefined : HASHSOME_BUILD_ID;

export interface VersionWatchOptions {
  /** The build this page is. */
  buildId: string;

  /** The build being served now; undefined when it cannot be told (offline, an old server). */
  read: () => Promise<string | undefined>;
  reload: () => void;

  /** How often to ask while the page is open. Default one minute. */
  intervalMs?: number;

  /** Calls the function when the page may have been asleep: shown again, or back online. */
  onWake: (check: () => void) => () => void;

  /** Remembers when this page last reloaded for a new version, across the reload. */
  lastReload: { get: () => number | undefined; set: (time: number) => void };
  now?: () => number;
}

/** Never reload twice within this long: if the server keeps answering with another id (a stale cache
 * in front of it), the page would otherwise reload for ever. */
const REPEAT_MS = 30_000;

/**
 * Reloads the page when the server is serving a different build than the one it was loaded from. A
 * tablet or wall display keeps a dashboard open for weeks, and a deployment replaces the server
 * under it without replacing the page. Returns a function that stops watching.
 */
export function watchForNewVersion(options: VersionWatchOptions): () => void {
  const now = options.now ?? Date.now;
  let busy = false;

  const check = () => {
    if (busy) {
      return;
    }

    busy = true;
    options.read().then(
      (served) => {
        busy = false;
        if (served === undefined || served === options.buildId) {
          return;
        }

        const last = options.lastReload.get();
        if (last !== undefined && now() - last < REPEAT_MS) {
          return;
        }

        options.lastReload.set(now());
        options.reload();
      },
      () => {
        busy = false;
      },
    );
  };

  const timer = setInterval(check, options.intervalMs ?? 60_000);
  const stopWake = options.onWake(check);
  return () => {
    clearInterval(timer);
    stopWake();
  };
}

/** Starts watching in the browser, for a production build. Does nothing in dev. */
export function watchBrowserForNewVersion(): void {
  const buildId = PAGE_BUILD_ID;
  if (buildId === undefined) {
    return;
  }

  const KEY = 'hashsome:reloaded-at';
  watchForNewVersion({
    buildId,
    read: async () => {
      const response = await fetch(VERSION_PATH, { cache: 'no-store' });
      return response.ok ? ((await response.json()) as { id?: string }).id : undefined;
    },
    reload: () => window.location.reload(),
    onWake: (check) => {
      const onVisible = () => document.visibilityState === 'visible' && check();
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('online', check);
      return () => {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('online', check);
      };
    },
    lastReload: {
      get: () => {
        try {
          return Number(sessionStorage.getItem(KEY)) || undefined;
        } catch {
          return undefined;
        }
      },
      set: (time) => {
        try {
          sessionStorage.setItem(KEY, String(time));
        } catch {
          // Without storage the guard is the page's own memory only, which a reload loses.
        }
      },
    },
  });
}
