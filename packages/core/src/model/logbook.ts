/** One thing that happened to an entity: it turned on, went offline, ... and what or who caused it. */
export interface LogbookEntry {
  id: string;

  /** Lowercase, no actor prefix, e.g. "turned on", "became unavailable": capitalized when there is
   * no `actor` to lead with ("Turned on"), left lowercase after one ("Dan turned on"). */
  message: string;

  /** ISO 8601. */
  timestamp: string;

  /** Who or what caused it, e.g. "Dan" or "Bedtime". Omitted when it was the system (a device going offline). */
  actor?: string;

  /** Only matters when `actor` is set: a person gets an initials avatar, an automation (or anything
   * else that is not a person) a workflow icon. Default `'person'`. */
  actorKind?: 'person' | 'automation';

  /** What kind of change it was: it turned `on` or `off`, took another `state` (a new mode), or its
   * `availability` changed (the device could not be reached, or came back). Lets a row say more than
   * the words when nothing caused it: an on or off with no actor is often someone at a physical switch. */
  change?: 'on' | 'off' | 'state' | 'availability';
}

export interface LogbookQuery {
  /** How many of the latest entries to return. Default 20. */
  limit?: number;
}

export interface LogbookResult {
  /** Newest first; empty when the backend keeps no activity for the entity. */
  entries: LogbookEntry[];
}
