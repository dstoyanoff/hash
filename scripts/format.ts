import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'oxfmt';

const {
  $schema: _schema,
  ignorePatterns: _ignore,
  ...options
} = JSON.parse(readFileSync(join(import.meta.dirname, '..', '.oxfmtrc.json'), 'utf8'));

/** Formats generated source with this repo's own oxfmt config, so the output always matches `pnpm format:check`. */
export async function formatWithRepoConfig(fileName: string, source: string): Promise<string> {
  const { code, errors } = await format(fileName, source, options);
  if (errors.length > 0) {
    throw new Error(`Could not format ${fileName}: ${errors.map((e) => e.message).join('; ')}`);
  }

  return code;
}
