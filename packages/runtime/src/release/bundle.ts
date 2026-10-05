import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

/** The runtime's own entry for a packaged server, by path: it does not depend on how the project resolves `@hashsome/runtime`. */
const SERVE = fileURLToPath(new URL('../serve.ts', import.meta.url));

/**
 * Bundles a project's server into one file: the runtime, the project's `hashsome.config.ts` and every
 * integration it imports, with their dependencies, so the file runs with just `node` and no
 * `node_modules`. Secrets are not in it: the config reads them from the environment when it runs.
 * Uses Vite's own server build, so there is no bundler of its own to install.
 */
export async function bundleServer({ root, outFile }: { root: string; outFile: string }) {
  const outDir = dirname(outFile);
  // In the project, next to its config.
  const entry = join(root, '.hashsome-server-entry.ts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    entry,
    [
      `import config from ${JSON.stringify(join(root, 'hashsome.config.ts'))};`,
      `import { serve } from ${JSON.stringify(SERVE)};`,
      `serve(config, import.meta.url);`,
    ].join('\n'),
  );

  try {
    await build({
      root,
      configFile: false,
      logLevel: 'warn',
      // The runtime and the integrations are bundled in, not left to be installed.
      ssr: { noExternal: true, target: 'node' },
      build: {
        ssr: entry,
        outDir,
        emptyOutDir: false,
        minify: false,
        target: 'node24',
        rollupOptions: {
          output: {
            format: 'es',
            entryFileNames: basename(outFile),
            // Dependencies that are still CommonJS (express, ws) call `require`, which an ES module lacks.
            banner:
              "import { createRequire as __hashsomeCreateRequire } from 'node:module';\nconst require = __hashsomeCreateRequire(import.meta.url);",
          },
        },
      },
    });
  } finally {
    rmSync(entry, { force: true });
  }
}
