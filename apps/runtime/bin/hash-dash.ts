#!/usr/bin/env node
export {};

const commands = {
  dev: async () => (await import('../src/cli/dev.ts')).dev(),
  build: async () => (await import('../src/cli/build.ts')).build(),
  start: async () => (await import('../src/cli/start.ts')).start(),
} as const;

const command = process.argv[2] as keyof typeof commands | undefined;
const run = command && commands[command];
if (!run) {
  console.error(`Usage: hash-dash <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}
await run();
