import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { startServer } from '../server/production.ts';

/** `start` builds first, so what it serves is the project as it is now and with the environment it is
 * started with (the debug menu's `HASHSOME_DEBUG`, say, is part of the build); `--no-build` serves
 * what is already built. */
export function shouldBuild(args: string[]): boolean {
  return !args.includes('--no-build');
}

export async function start(args: string[] = []) {
  if (shouldBuild(args)) {
    // Loaded only for this: serving a build needs none of Vite.
    await (await import('./build.ts')).build({ exit: false });
  }

  const config = await loadConfig(resolve(process.cwd()));
  if (!existsSync(join(config.root, 'build', 'client', 'index.html'))) {
    console.error('No build found. Run `hashsome build` first, or start without `--no-build`.');
    process.exit(1);
  }

  startServer(config);
}
