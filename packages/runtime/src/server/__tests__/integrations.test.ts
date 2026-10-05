import type { Integration } from '@hashsome/core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startIntegrations } from '../integrations.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const fake = (connect: () => Promise<void>) =>
  ({
    id: 'ha',
    connect: vi.fn<() => Promise<void>>(connect),
    disconnect: vi.fn<() => void>(),
  }) as unknown as Integration;

test('retries with exponential backoff until connected, without throwing', async () => {
  let attempts = 0;
  const ha = fake(() => (++attempts < 3 ? Promise.reject(new Error('down')) : Promise.resolve()));
  startIntegrations([ha], { minDelayMs: 100, maxDelayMs: 1000 });
  await vi.advanceTimersByTimeAsync(0);
  expect(attempts).toBe(1);
  await vi.advanceTimersByTimeAsync(100);
  expect(attempts).toBe(2);
  await vi.advanceTimersByTimeAsync(200);
  expect(attempts).toBe(3);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(attempts).toBe(3);
});

test('stop cancels retries and disconnects', async () => {
  const ha = fake(() => Promise.reject(new Error('down')));
  const stop = startIntegrations([ha], { minDelayMs: 100 });
  await vi.advanceTimersByTimeAsync(0);
  stop();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(ha.connect).toHaveBeenCalledTimes(1);
  expect(ha.disconnect).toHaveBeenCalled();
});
