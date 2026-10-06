import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USAGE = `Usage: hashsome upgrade [--dry-run]

Updates every @hashsome/* package your project depends on to the latest release with pnpm. They
share one version, so they move together. Packages linked from a local checkout (workspace:, link:,
file:) are left alone. A project on another package manager upgrades them by hand.

Options:
  --dry-run   Show what would run, change nothing

Afterwards run your typecheck, and read the release notes for what changed:
  https://github.com/dstoyanoff/hashsome/releases
`;

export interface ProjectPackage {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
}

const SCOPE = '@hashsome/';

/** A version spec that points at a folder on this machine, not at a release on the registry. */
const isLocal = (spec: string) => /^(workspace|link|file|portal):/.test(spec);

/** The @hashsome packages the project depends on, split into the ones to upgrade and the ones linked locally. */
export function hashsomeDependencies(pkg: ProjectPackage): { upgrade: string[]; linked: string[] } {
  const all = { ...pkg.devDependencies, ...pkg.dependencies };
  const names = Object.keys(all)
    .filter((name) => name.startsWith(SCOPE))
    .toSorted();

  return {
    upgrade: names.filter((name) => !isLocal(all[name]!)),
    linked: names.filter((name) => isLocal(all[name]!)),
  };
}

/** The other package manager the project uses, if it uses one: the one it names in `packageManager`, else the one whose lockfile it has. `undefined` for pnpm, or when it says nothing. */
export function otherPackageManager(
  pkg: ProjectPackage,
  hasFile: (name: string) => boolean,
): 'npm' | 'yarn' | 'bun' | undefined {
  const named = pkg.packageManager?.split('@')[0];
  if (named === 'npm' || named === 'yarn' || named === 'bun') {
    return named;
  }

  if (named === 'pnpm' || hasFile('pnpm-lock.yaml')) {
    return undefined;
  }

  if (hasFile('yarn.lock')) {
    return 'yarn';
  }

  if (hasFile('bun.lock') || hasFile('bun.lockb')) {
    return 'bun';
  }

  return hasFile('package-lock.json') ? 'npm' : undefined;
}

/** The pnpm command that moves `names` to their latest release. */
export function upgradeCommand(names: string[]): [string, ...string[]] {
  return ['pnpm', 'update', '--latest', ...names];
}

/** One line per package whose version spec changed. */
export function describeChanges(before: ProjectPackage, after: ProjectPackage): string[] {
  const spec = (pkg: ProjectPackage, name: string) =>
    pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];

  const names = new Set(
    Object.keys({ ...after.devDependencies, ...after.dependencies }).filter((name) =>
      name.startsWith(SCOPE),
    ),
  );

  return [...names]
    .toSorted()
    .flatMap((name) =>
      spec(before, name) !== spec(after, name)
        ? [`  ${name}  ${spec(before, name)} -> ${spec(after, name)}`]
        : [],
    );
}

const read = (file: string): ProjectPackage => JSON.parse(readFileSync(file, 'utf8'));

/** `hashsome upgrade`: updates the project's @hashsome packages to the latest release. */
export function upgradeCommandLine(args: string[], root: string = resolve(process.cwd())): void {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const unknown = args.filter((arg) => arg !== '--dry-run');
  if (unknown.length > 0) {
    throw new Error(`Unknown option "${unknown[0]}"\n\n${USAGE}`);
  }

  const file = join(root, 'package.json');
  if (!existsSync(file)) {
    throw new Error('No package.json here. Run this from your project.');
  }

  const before = read(file);
  const { upgrade, linked } = hashsomeDependencies(before);
  if (linked.length > 0) {
    console.log(`Linked from a local checkout, left as they are: ${linked.join(', ')}`);
  }

  if (upgrade.length === 0) {
    console.log('No @hashsome packages from the registry to upgrade.');
    return;
  }

  const other = otherPackageManager(before, (name) => existsSync(join(root, name)));
  if (other) {
    const add = other === 'npm' ? 'npm install' : `${other} add`;
    throw new Error(
      `This project uses ${other}, and hashsome upgrade only runs pnpm. Upgrade by hand:\n  ${add} ${upgrade.map((name) => `${name}@latest`).join(' ')}`,
    );
  }

  const [command, ...rest] = upgradeCommand(upgrade);
  console.log(`$ ${[command, ...rest].join(' ')}`);
  if (args.includes('--dry-run')) {
    return;
  }

  const result = spawnSync(command, rest, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.error?.message.includes('ENOENT')
        ? `${command} is not installed`
        : `${command} failed. Nothing else was changed.`,
    );
  }

  const changes = describeChanges(before, read(file));
  console.log(
    changes.length > 0 ? `\nUpgraded:\n${changes.join('\n')}` : '\nAlready on the latest.',
  );
}
