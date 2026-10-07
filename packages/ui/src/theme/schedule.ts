import type { EntityRef } from '@hashsome/core';

/**
 * When the dark theme is on, for a display that should change with the time of day:
 * - `{ dark: { from: '19:00', to: '07:00' } }`: dark between two times of day on the display's own
 *   clock. `to` may be earlier than `from` (it is the next morning); the same time twice means never dark.
 * - `{ sun: 'ha:sun.sun' }`: dark while a `daylight` sensor (the sun entity: `on` while the sun is up) is off.
 */
export type ThemeSchedule = { dark: { from: string; to: string } } | { sun: EntityRef };

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight for `HH:MM`. Throws on anything else, naming what was wrong. */
export function minutesOf(time: string, name: string): number {
  const match = TIME.exec(time);
  if (!match) {
    throw new Error(`theme.dark.${name} must be a time like "19:00", not "${time}"`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

const minutesNow = (now: Date) => now.getHours() * 60 + now.getMinutes();

/** Whether `now` is inside the dark hours. */
export function isDarkAt(range: { from: string; to: string }, now: Date): boolean {
  const from = minutesOf(range.from, 'from');
  const to = minutesOf(range.to, 'to');
  const at = minutesNow(now);
  if (from === to) {
    return false;
  }

  // Dark hours that run past midnight are everything except the daytime between `to` and `from`.
  return from < to ? at >= from && at < to : at >= from || at < to;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long until the theme next changes, in ms; `Infinity` when it never does. */
export function msUntilSwitch(range: { from: string; to: string }, now: Date): number {
  const from = minutesOf(range.from, 'from');
  const to = minutesOf(range.to, 'to');
  if (from === to) {
    return Infinity;
  }

  const wait = (minutes: number) => {
    const at = new Date(now);
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const ms = at.getTime() - now.getTime();
    return ms > 0 ? ms : ms + DAY_MS;
  };

  return Math.min(wait(from), wait(to));
}

/** What a `daylight` sensor says (`on` while the sun is up): dark once it is `off`. `undefined` for anything else (not loaded yet, unavailable, not that kind of sensor). */
export function sunIsDown(
  entity: { kind: string; value?: string; measurement?: string } | null | undefined,
) {
  if (entity?.kind !== 'sensor' || entity.measurement !== 'daylight') {
    return undefined;
  }

  return entity.value === 'off' ? true : entity.value === 'on' ? false : undefined;
}
