import type { Plugin } from 'vite';

/** Where a build records its id, next to the client files, and where the server tells it. */
export const VERSION_FILE = 'version.json';
export const VERSION_PATH = '/_hashsome/version';

let id: string | undefined;

/** One per `hashsome build` run: the same for everything that run produces. */
export const buildId = (): string =>
  (id ??= process.env.HASHSOME_BUILD_ID || Date.now().toString(36));

/**
 * Gives a production build an id that its client knows (as `HASHSOME_BUILD_ID`) and the server
 * can tell (the client directory gets a `version.json`). A page left open compares the two and
 * reloads when a newer build is being served. Dev builds have neither, so nothing is watched there.
 */
export function hashsomeBuildId(): Plugin {
  return {
    name: 'hashsome:build-id',
    apply: 'build',
    config: () => ({ define: { HASHSOME_BUILD_ID: JSON.stringify(buildId()) } }),
    generateBundle() {
      // The server's own build has no use for it; the client's output is what gets served.
      if (this.environment && this.environment.name !== 'client') {
        return;
      }

      this.emitFile({
        type: 'asset',
        fileName: VERSION_FILE,
        source: JSON.stringify({ id: buildId() }),
      });
    },
  };
}
