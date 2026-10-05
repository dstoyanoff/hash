import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { bundleServer } from './bundle.ts';
import {
  chartDeployment,
  chartHelpers,
  chartIngress,
  chartNotes,
  chartService,
  chartValues,
  chartYaml,
  composeFile,
  composeReadme,
  dockerfile,
  envExample,
  helmReadme,
  imageRef,
  importScript,
  plainReadme,
  releaseReadme,
  safeName,
  type ReleaseInfo,
  type Target,
} from './render.ts';

export interface ReleaseOptions {
  /** The project's folder. */
  root: string;

  /** Where the release goes, relative to `root`. Emptied first. Default `release`. */
  out: string;

  /** Default: the project's package name. */
  name?: string | undefined;

  /** Default: the time, so every release has a tag of its own and a node picks up the update. */
  tag?: string | undefined;

  /** What the image is built for, e.g. `linux/amd64`. Default: this machine's. */
  platform?: string | undefined;
  targets: readonly Target[];

  /** Build the image and write `image.tar` for the targets that run one (`compose`, `helm`, `image`). Needs Docker. */
  image: boolean;
  port: number;
}

const timestamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

function hostPlatform(): string {
  return process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64';
}

/** Runs a command, passing its output through; throws when it fails. */
function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.error?.message.includes('ENOENT')
        ? `${command} is not installed (use --no-image to skip building the image)`
        : `${command} ${args.join(' ')} failed`,
    );
  }
}

const write = (dir: string, files: Record<string, string>) => {
  for (const [name, content] of Object.entries(files)) {
    const file = join(dir, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
};

/**
 * Writes the release for the chosen `targets` only: `plain` is the server bundled into one file next
 * to the built client; `compose` and `helm` are run from an image, so they also get `image.tar`.
 * `build` must have run (the client is read from `build/client`).
 */
export async function packageRelease(
  options: ReleaseOptions,
): Promise<{ out: string; image?: string }> {
  const { root, targets } = options;
  const needsImage =
    targets.includes('compose') || targets.includes('helm') || targets.includes('image');

  const client = join(root, 'build', 'client');
  if (!existsSync(join(client, 'index.html'))) {
    throw new Error('No build found. Run `hash-dash build` first.');
  }

  const pkg = existsSync(join(root, 'package.json'))
    ? (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name?: string })
    : {};

  const envFile = join(root, '.env.example');
  const info: ReleaseInfo = {
    name: safeName(options.name ?? pkg.name ?? 'hash'),
    tag: options.tag ?? timestamp(),
    platform: options.platform ?? hostPlatform(),
    port: options.port,
    image: options.image && needsImage,
    envExample: existsSync(envFile) ? readFileSync(envFile, 'utf8') : undefined,
  };

  const out = join(root, options.out);
  rmSync(out, { recursive: true, force: true });

  // The bundle is what every target is made from. It stays in the release only when asked for;
  // otherwise it is just the folder the image is built from.
  const keepPlain = targets.includes('plain');
  mkdirSync(out, { recursive: true });
  const plain = keepPlain ? join(out, 'plain') : mkdtempSync(join(tmpdir(), 'hash-release-'));
  mkdirSync(plain, { recursive: true });
  cpSync(client, join(plain, 'client'), { recursive: true });
  await bundleServer({ root, outFile: join(plain, 'server.mjs') });
  write(plain, { Dockerfile: dockerfile(info) });
  if (keepPlain) {
    write(plain, { 'README.md': plainReadme(info) });
  }

  try {
    if (info.image) {
      run(
        'docker',
        ['buildx', 'build', '--platform', info.platform, '--load', '-t', imageRef(info), plain],
        root,
      );

      run('docker', ['save', imageRef(info), '-o', join(out, 'image.tar')], root);
    }
  } finally {
    if (!keepPlain) {
      rmSync(plain, { recursive: true, force: true });
    }
  }

  if (targets.includes('compose')) {
    write(join(out, 'compose'), {
      'compose.yaml': composeFile(info),
      '.env.example': envExample(info),
      'README.md': composeReadme(info),
    });
  }

  if (targets.includes('helm')) {
    const helm = join(out, 'helm');
    write(helm, {
      'Chart.yaml': chartYaml(info),
      'values.yaml': chartValues(info),
      'templates/_helpers.tpl': chartHelpers(),
      'templates/deployment.yaml': chartDeployment(),
      'templates/service.yaml': chartService(),
      'templates/ingress.yaml': chartIngress(),
      'templates/NOTES.txt': chartNotes(),
      'import-image.sh': importScript(info),
      'README.md': helmReadme(info),
    });

    chmodSync(join(helm, 'import-image.sh'), 0o755);
  }

  write(out, {
    'README.md': releaseReadme(info, targets),
  });

  return { out, ...(info.image ? { image: imageRef(info) } : {}) };
}
