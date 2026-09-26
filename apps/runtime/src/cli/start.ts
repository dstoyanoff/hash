import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { HASH_DIR } from '../generate.ts';
import { startServer } from '../server/production.ts';

export async function start() {
  const config = await loadConfig(resolve(process.cwd()));
  if (!existsSync(join(config.root, HASH_DIR, 'build', 'client', 'index.html'))) {
    console.error('No build found. Run `hash build` first.');
    process.exit(1);
  }
  startServer(config);
}
