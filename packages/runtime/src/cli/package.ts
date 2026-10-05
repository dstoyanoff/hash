import { resolve } from 'node:path';
import { loadConfig } from '../config.ts';
import { packageRelease } from '../release/package.ts';
import { TARGETS, type Target } from '../release/render.ts';
import { build } from './build.ts';

const USAGE = `Usage: hash-dash package [target...] [options]

Builds the project and writes what you need to deploy it, into ./release.

Targets (one or more; with none, \`package.targets\` in hash.config.ts):
  plain     The server (one file) and the client. Runs with just Node 24+. No Docker needed.
  compose   A Docker Compose file and the container image (image.tar).
  helm      A Helm chart for k3s/Kubernetes and the container image (image.tar).
  image     Only the container image (image.tar), for manifests you write yourself.

Options:
  --platform <p>   What the image runs on, e.g. linux/amd64 (default: package.platform, else this machine's)
  --name <name>    Image, service and chart name (default: package.name, else the package name)
  --tag <tag>      Image tag (default: the time, so each release has its own)
  --out <dir>      Where to write it (default: release)
  --port <n>       The port the server listens on in the image (default: package.port, else 3000)
  --no-image       Skip building the image (no Docker needed; compose and helm need one later)

Examples:
  hash-dash package helm --platform linux/amd64
  hash-dash package plain
`;

const VALUE_FLAGS = ['platform', 'name', 'tag', 'out', 'port'];

/** Reads the targets and the \`--flag value\` / \`--flag=value\` / \`--no-image\` options. */
export function parseArgs(args: string[]) {
  const values = new Map<string, string>();
  const targets: Target[] = [];
  const flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) {
      if (!TARGETS.includes(arg as Target)) {
        throw new Error(`Unknown target "${arg}" (use ${TARGETS.join(', ')})`);
      }

      targets.push(arg as Target);
      continue;
    }

    const [key, inline] = arg.slice(2).split('=', 2) as [string, string | undefined];
    if (key === 'no-image' || key === 'help') {
      flags.add(key);
    } else if (VALUE_FLAGS.includes(key)) {
      const value = inline ?? args[++i];
      if (value === undefined) {
        throw new Error(`--${key} needs a value`);
      }

      values.set(key, value);
    } else {
      throw new Error(`Unknown option --${key}`);
    }
  }

  const port = values.has('port') ? Number(values.get('port')) : undefined;
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error('--port must be a port number');
  }

  return {
    help: flags.has('help'),
    image: !flags.has('no-image'),
    platform: values.get('platform'),
    name: values.get('name'),
    tag: values.get('tag'),
    out: values.get('out') ?? 'release',
    targets,
    port,
  };
}

export async function packageCommand(args: string[]) {
  let options: ReturnType<typeof parseArgs>;
  try {
    options = parseArgs(args);
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`);
    process.exit(1);
  }

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const root = resolve(process.cwd());
  const defaults = (await loadConfig(root)).package;
  const targets = options.targets.length > 0 ? options.targets : (defaults.targets ?? []);
  if (targets.length === 0) {
    console.error(`Say what to package for: ${TARGETS.join(', ')}.\n\n${USAGE}`);
    process.exit(1);
  }

  await build({ exit: false });
  try {
    const { out, image: ref } = await packageRelease({
      root,
      out: options.out,
      name: options.name ?? defaults.name,
      tag: options.tag,
      platform: options.platform ?? defaults.platform,
      port: options.port ?? defaults.port ?? 3000,
      image: options.image,
      targets: [...new Set(targets)],
    });

    console.log(`\nRelease (${[...new Set(targets)].join(', ')}) written to ${out}`);
    if (ref) {
      console.log(`\nImage: ${ref}\nOn the server: k3s ctr -n k8s.io images import image.tar`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  process.exit(0);
}
