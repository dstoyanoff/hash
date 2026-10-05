import type { Integration } from '@hash/core';

export interface StartOptions {
  log?: (message: string) => void;
  minDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Connects every integration, retrying with exponential backoff until it
 * succeeds. Never throws: an unreachable Home Assistant must not stop the
 * server (dashboards show "unavailable" and recover).
 */
export function startIntegrations(integrations: Integration[], options: StartOptions = {}) {
  const log = options.log ?? (() => {});
  const min = options.minDelayMs ?? 1000;
  const max = options.maxDelayMs ?? 30_000;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  const attempt = (integration: Integration, retry: number) => {
    if (stopped) {
      return;
    }

    integration.connect().then(
      () => log(`[${integration.id}] connected`),
      (error: unknown) => {
        const delay = Math.min(max, min * 2 ** retry);
        const reason = error instanceof Error ? error.message : String(error);
        log(`[${integration.id}] connect failed (${reason}); retrying in ${delay}ms`);
        const timer = setTimeout(() => {
          timers.delete(timer);
          attempt(integration, retry + 1);
        }, delay);

        timers.add(timer);
      },
    );
  };

  for (const integration of integrations) {
    attempt(integration, 0);
  }

  return () => {
    stopped = true;
    for (const timer of timers) {
      clearTimeout(timer);
    }

    for (const integration of integrations) {
      integration.disconnect();
    }
  };
}
