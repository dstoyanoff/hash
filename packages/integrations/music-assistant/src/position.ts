/**
 * Where playback is, as the dashboard shows it, for one Music Assistant player and its queue.
 *
 * Music Assistant does not make this easy. It sends no queue updates while a track plays, only on
 * changes, so a position has to be carried forward from the last one. A pause on a player that
 * cannot hold a stream open is really a stop: the queue's counter goes back to the start and only
 * its `resume_pos` says where playback will pick up. Resuming then starts the stream over, a moment
 * before where it was, before seeking to the spot. Reading each message as the truth makes the
 * counter jump back and forth, so this keeps a position of its own and moves it only forward
 * across those steps.
 *
 * Everything here is pure: a state in, a message in, a state out.
 */

export interface Position {
  /** The item the queue is on, to tell a new track from a pause on the same one. */
  item?: string;

  /** Where playback was believed to be, in seconds, as of `elapsedAt` (UTC epoch seconds). */
  elapsed?: number;
  elapsedAt?: number;

  /** Where Music Assistant says it will pick the item up again. */
  resume?: number;

  /** Where playback was when it stopped: the last position plus the time since it was seen. */
  held?: number;

  /** When playback started again after a stop, to tell the stream starting over from a seek. */
  resumedAt?: number;
}

/** Only `idle` is a stop. Playing, buffering, paused and a state not yet known all follow the counter. */
const following = (playback: string | undefined) => playback !== 'idle';

/** How far before where it was a resumed stream may start, which is not shown as going back. */
const REWIND_SECONDS = 2;

/** How long after resuming a position much further back is the stream starting over. */
const SETTLE_SECONDS = 4;

/** A queue message: what it says about the item, the counter and the resume position. */
export interface QueueMessage {
  item?: string | undefined;
  elapsed?: number | undefined;
  resume?: number | undefined;
}

export function onQueue(
  position: Position,
  message: QueueMessage,
  playback: string | undefined,
  now: number,
): Position {
  // A different item has nothing to do with where the last one was.
  const same =
    message.item === undefined || position.item === undefined || message.item === position.item;

  const base: Position = same ? position : {};
  // Stopped, Music Assistant clears the resume spot as playback is about to start, before the player
  // says so. A resume spot that goes down while stopped is that, and is not where it will resume.
  const resume =
    !following(playback) && base.resume !== undefined && message.resume !== undefined
      ? Math.max(base.resume, message.resume)
      : message.resume;

  const next: Position = {
    ...base,
    ...(message.item !== undefined ? { item: message.item } : {}),
    ...(resume !== undefined ? { resume } : {}),
  };

  if (message.elapsed === undefined) {
    return next;
  }

  if (!following(playback)) {
    // Stopped, its counter is back at the start: only the first number is of any use.
    return next.elapsed === undefined && next.held === undefined
      ? { ...next, elapsed: message.elapsed, elapsedAt: now }
      : next;
  }

  const { held, resumedAt } = next;
  if (held === undefined) {
    return { ...next, elapsed: message.elapsed, elapsedAt: now };
  }

  const { held: _held, resumedAt: _resumedAt, ...rest } = next;
  if (message.elapsed >= held - REWIND_SECONDS) {
    // Where it was, give or take the moment the stream starts early: not a step back.
    return { ...rest, elapsed: Math.max(message.elapsed, held), elapsedAt: now };
  }

  if (resumedAt !== undefined && now - resumedAt < SETTLE_SECONDS) {
    // The stream starting over from the beginning, before it seeks to the spot.
    return next;
  }

  // Well after it settled, going back is someone seeking.
  return { ...rest, elapsed: message.elapsed, elapsedAt: now };
}

/** The player's state changed: a stop remembers where it got to, and a start from a stop begins there. */
export function onPlayback(
  position: Position,
  from: string | undefined,
  to: string | undefined,
  now: number,
): Position {
  if (from === to) {
    return position;
  }

  if (following(from) && !following(to)) {
    if (position.elapsed === undefined) {
      return position;
    }

    const since =
      from === 'playing' && position.elapsedAt !== undefined
        ? Math.max(0, now - position.elapsedAt)
        : 0;

    return { ...position, held: position.elapsed + since };
  }

  if (!following(from) && following(to)) {
    // Starting from a stop: from where it was held, or, if that stop was not seen, from the spot
    // Music Assistant says it will resume at.
    const origin = position.held ?? position.resume ?? position.elapsed;
    if (origin === undefined) {
      return position;
    }

    // The resume spot is only meaningful while stopped; the next stop brings a new one.
    const { resume: _resume, ...rest } = position;
    return { ...rest, held: origin, elapsed: origin, elapsedAt: now, resumedAt: now };
  }

  return position;
}

/** What to show: playing, the counter; stopped, the later of where it was held and the resume spot. */
export function positionOf(position: Position, playback: string | undefined): number | undefined {
  if (following(playback)) {
    return position.elapsed;
  }

  const spots = [position.held, position.resume].filter(
    (spot): spot is number => spot !== undefined,
  );

  return spots.length > 0 ? Math.max(...spots) : position.elapsed;
}
