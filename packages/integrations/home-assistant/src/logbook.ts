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

const UNREACHABLE = new Set(['unavailable', 'unknown']);

/** What kind of change a state is: on, off, the device being (un)reachable, or any other mode. */
function changeOf(state: string | undefined, back: boolean): NonNullable<LogbookEntry['change']> {
  if (back || (state !== undefined && UNREACHABLE.has(state))) {
    return 'availability';
  }

  return state === 'on' || state === 'off' ? state : 'state';
}

/** The events as entries, newest first and at most `limit` of them. An event without a usable time is
 * dropped. A change of state with no cause that follows the device being unreachable is worded as it
 * coming back ("came back online, on"), not as someone turning it on. */
export function toLogbookEntries(
  events: readonly HaLogbookEvent[],
  lookup: LogbookLookup,
  limit: number,
): LogbookEntry[] {
  const lastState = new Map<string, string | undefined>();
  return events
    .flatMap((event) =>
      typeof event.when === 'number' && Number.isFinite(event.when)
        ? [{ event, when: event.when }]
        : [],
    )
    .toSorted((a, b) => a.when - b.when)
    .map(({ event, when }) => {
      const entity = event.entity_id ?? '';
      const before = lastState.get(entity);
      lastState.set(entity, event.state);
      const cause = actorOf(event, lookup);
      const back =
        cause.actor === undefined &&
        before !== undefined &&
        UNREACHABLE.has(before) &&
        event.state !== undefined &&
        !UNREACHABLE.has(event.state);

      return {
        id: `${entity}@${when}`,
        message: back ? `came back online, ${event.state}` : messageFor(event.state),
        timestamp: new Date(when * 1000).toISOString(),
        change: changeOf(event.state, back),
        ...cause,
      } satisfies LogbookEntry;
    })
    .toReversed()
    .slice(0, limit);
}
