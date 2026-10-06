import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USAGE = `Usage: hashsome upgrade [--dry-run]

Updates every @hashsome/* package your project depends on to the latest release, with the package
manager the project uses (pnpm, npm, yarn or bun). They share one version, so they move together.
Packages linked from a local checkout (workspace:, link:, file:) are left alone.

Options:
  --dry-run   Show what would run, change nothing

Afterwards run your typecheck, and read the changelog for what changed:
  https://github.com/dstoyanoff/hashsome/releases
`;

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

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

/** The package manager the project uses: the one it names in `packageManager`, else the one whose lockfile it has, else npm. */
export function detectPackageManager(
  pkg: ProjectPackage,
  hasFile: (name: string) => boolean,
): PackageManager {
  const named = pkg.packageManager?.split('@')[0];
  if (named === 'pnpm' || named === 'npm' || named === 'yarn' || named === 'bun') {
    return named;
  }

  if (hasFile('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (hasFile('yarn.lock')) {
    return 'yarn';
  }

  if (hasFile('bun.lock') || hasFile('bun.lockb')) {
    return 'bun';
  }

  return 'npm';
}

/** The command that moves `names` to their latest release. */
export function upgradeCommand(manager: PackageManager, names: string[]): [string, ...string[]] {
  const latest = names.map((name) => `${name}@latest`);
  switch (manager) {
    case 'pnpm':
      return ['pnpm', 'update', '--latest', ...names];
    case 'yarn':
      return ['yarn', 'add', ...latest];
    case 'bun':
      return ['bun', 'add', ...latest];
    default:
      return ['npm', 'install', ...latest];
  }
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

  const manager = detectPackageManager(before, (name) => existsSync(join(root, name)));
  const [command, ...rest] = upgradeCommand(manager, upgrade);
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
