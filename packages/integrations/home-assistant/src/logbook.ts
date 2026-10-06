import type { LogbookEntry } from '@hashsome/core';

/** One event of `logbook/get_events`: a change to an entity and, when known, what caused it. Every
 * field but the time is optional. */
export interface HaLogbookEvent {
  /** Seconds since the epoch, with a fraction. */
  when?: number;
  entity_id?: string;

  /** The state it changed to. */
  state?: string;
  context_user_id?: string | null;
  context_event_type?: string | null;
  context_domain?: string | null;
  context_name?: string | null;
  context_entity_id?: string | null;
}

/** What the integration knows that an event refers to by id. */
export interface LogbookLookup {
  /** The name of the person for a Home Assistant user id (a `person` entity carries it). */
  personByUserId: ReadonlyMap<string, string>;

  /** The name of an entity: an automation, a light group. */
  nameOf: (entityId: string) => string | undefined;
}

/** What happened, from the state it changed to. Lowercase, with no actor in front. */
export function messageFor(state: string | undefined): string {
  switch (state) {
    case undefined:
    case '':
      return 'changed';
    case 'on':
      return 'turned on';
    case 'off':
      return 'turned off';
    case 'unavailable':
      return 'became unavailable';
    case 'unknown':
      return 'became unknown';
    default:
      return `changed to ${state}`;
  }
}

/** Who or what caused an event. An automation comes first (it is the more specific cause, even when
 * someone ran it), then a person by their user id, then another entity that drove it (a light group).
 * Nobody when nothing says: a device going offline. */
function actorOf(
  event: HaLogbookEvent,
  lookup: LogbookLookup,
): Pick<LogbookEntry, 'actor' | 'actorKind'> {
  const triggeredBy = event.context_entity_id ?? undefined;
  if (
    event.context_event_type === 'automation_triggered' ||
    event.context_domain === 'automation'
  ) {
    const name = event.context_name ?? (triggeredBy ? lookup.nameOf(triggeredBy) : undefined);
    return name ? { actor: name, actorKind: 'automation' } : {};
  }

  const person = event.context_user_id
    ? lookup.personByUserId.get(event.context_user_id)
    : undefined;

  if (person) {
    return { actor: person, actorKind: 'person' };
  }

  if (triggeredBy && triggeredBy !== event.entity_id) {
    return { actor: lookup.nameOf(triggeredBy) ?? triggeredBy, actorKind: 'automation' };
  }

  return {};
}

/** The events as entries, newest first and at most `limit` of them. An event without a usable time is dropped. */
export function toLogbookEntries(
  events: readonly HaLogbookEvent[],
  lookup: LogbookLookup,
  limit: number,
): LogbookEntry[] {
  return events
    .flatMap((event) =>
      typeof event.when === 'number' && Number.isFinite(event.when)
        ? [{ event, when: event.when }]
        : [],
    )
    .toSorted((a, b) => b.when - a.when)
    .slice(0, limit)
    .map(({ event, when }) => ({
      id: `${event.entity_id ?? ''}@${when}`,
      message: messageFor(event.state),
      timestamp: new Date(when * 1000).toISOString(),
      ...actorOf(event, lookup),
    }));
}
