import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { watchForNewVersion, type VersionWatchOptions } from '../version-watch.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(
  served: Array<string | undefined | Error>,
  overrides: Partial<VersionWatchOptions> = {},
) {
  let wake: () => void = () => undefined;
  let last: number | undefined;
  const answers = [...served];
  const reload = vi.fn<() => void>();
  const read = vi.fn<() => Promise<string | undefined>>(async () => {
    const next = answers.length > 1 ? answers.shift() : answers[0];
    if (next instanceof Error) {
      throw next;
    }

    return next;
  });

  const stop = watchForNewVersion({
    buildId: 'old',
    read,
    reload,
    onWake: (check) => {
      wake = check;
      return () => undefined;
    },
    lastReload: { get: () => last, set: (time) => void (last = time) },
    ...overrides,
  });

  return { reload, read, stop, wake: () => wake() };
}

test('reloads when the server is serving another build, at the next check', async () => {
  const { reload, read } = setup(['new']);
  await vi.advanceTimersByTimeAsync(59_000);
  expect(read).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(2_000);
  expect(read).toHaveBeenCalledTimes(1);
  expect(reload).toHaveBeenCalledTimes(1);
});

test('does nothing while the build is the same, or cannot be told', async () => {
  const { reload, read } = setup(['old', undefined, new Error('offline')]);
  await vi.advanceTimersByTimeAsync(180_000);
  expect(read).toHaveBeenCalledTimes(3);
  expect(reload).not.toHaveBeenCalled();
});

test('checks at once when the page wakes up, without waiting for the interval', async () => {
  const { reload, wake } = setup(['new']);
  wake();
  await vi.advanceTimersByTimeAsync(0);
  expect(reload).toHaveBeenCalledTimes(1);
});

test('does not reload again within half a minute of the last reload (a stale cache must not loop)', async () => {
  let time = 1_000_000;
  const { reload, wake } = setup(['new'], { now: () => time });
  wake();
  await vi.advanceTimersByTimeAsync(0);
  expect(reload).toHaveBeenCalledTimes(1);

  time += 10_000;
  wake();
  await vi.advanceTimersByTimeAsync(0);
  expect(reload).toHaveBeenCalledTimes(1);

  time += 25_000;
  wake();
  await vi.advanceTimersByTimeAsync(0);
  expect(reload).toHaveBeenCalledTimes(2);
});

test('stops asking once it is stopped', async () => {
  const { read, stop } = setup(['old']);
  stop();
  await vi.advanceTimersByTimeAsync(300_000);
  expect(read).not.toHaveBeenCalled();
});
