import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { startServer } from '../server/production.ts';

export async function start() {
  const config = await loadConfig(resolve(process.cwd()));
  if (!existsSync(join(config.root, 'build', 'client', 'index.html'))) {
    console.error('No build found. Run `hashsome build` first.');
    process.exit(1);
  }

  startServer(config);
}
