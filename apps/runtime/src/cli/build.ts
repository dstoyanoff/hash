import { createBuilder } from 'vite';
import { createViteConfig } from '../vite.ts';
import { prepare } from './prepare.ts';

export async function build() {
  const config = await prepare();
  const inline = createViteConfig(config);
  // React Router's SPA prerender step starts a Vite preview server that resolves the
  // project from the working directory.
  process.chdir(inline.root ?? config.root);
  const builder = await createBuilder(inline);
  await builder.buildApp();
  // Vite/React Router leave handles open after the SPA prerender; nothing else to wait for.
  process.exit(0);
}
