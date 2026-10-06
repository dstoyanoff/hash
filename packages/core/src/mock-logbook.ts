import type { Entity, LogbookEntry, LogbookQuery, LogbookResult } from './model/index.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Who the made-up activity is caused by: two people at home, and two automations. */
const ACTORS: { actor?: string; actorKind?: 'person' | 'automation' }[] = [
  { actor: 'Dan' },
  { actor: 'Bedtime', actorKind: 'automation' },
  { actor: 'Alex' },
  { actor: 'Sunrise', actorKind: 'automation' },
  {},
];

/** The kinds of entity that switch on and off, and so have activity worth showing. */
const SWITCHING = new Set(['light', 'switch', 'climate']);

/**
 * Made-up but believable activity for a mock light, switch or heater, so the History section of its
 * drawer has something to show: it turns on and off through the past days, caused by a person or an
 * automation, now and then going offline by itself. The same every time for the same entity and
 * moment (`now` is a parameter so a test can pin it). Anything else has none.
 */
export function mockLogbook(
  entityId: string,
  entity: Entity | undefined,
  query: LogbookQuery,
  now: number = Date.now(),
): LogbookResult {
  if (!entity || !SWITCHING.has(entity.kind)) {
    return { entries: [] };
  }

  const limit = Math.max(1, Math.min(query.limit ?? 20, 100));
  const entries: LogbookEntry[] = [];
  let on = entity.kind === 'light' ? (entity as { on?: boolean }).on === true : true;
  for (let i = 0; i < limit; i += 1) {
    // Further back and a little irregular, newest first.
    const at = now - (i + 1) * 3 * HOUR - ((i * 7919) % 50) * MINUTE;
    const cause = ACTORS[(i + entityId.length) % ACTORS.length]!;
    const lost = i % 9 === 8;
    entries.push({
      id: `${entityId}@${at}`,
      message: lost ? 'became unavailable' : on ? 'turned on' : 'turned off',
      timestamp: new Date(at).toISOString(),
      change: lost ? 'availability' : on ? 'on' : 'off',
      ...(lost ? {} : cause),
    });

    if (!lost) {
      on = !on;
    }
  }

  return { entries };
}
