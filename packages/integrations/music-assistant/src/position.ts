/**
 * Where playback is, as the dashboard shows it, for one Music Assistant player and its queue.
 *
 * Music Assistant does not make this easy. It sends no queue updates while a track plays, only on
 * changes, so a position has to be carried forward from the last one. A pause on a player that
 * cannot hold a stream open is really a stop: the queue's counter goes back to the start and only
 * its `resume_pos` says where playback will pick up, and that number is cleared as playback starts.
 * Reading each message as the truth makes the counter jump back and forth around a pause.
 *
 * So this keeps a position of its own, and follows two rules. While stopped, show where it was
 * stopped. Once playing, the queue's own counter is the truth, from its first message on.
 *
 * Everything here is pure: a state in, a message in, a state out.
 */

export interface Position {
  /** The track the queue is on, to tell a new track from a pause on the same one. */
  item?: string;

  /** Where playback was believed to be, in seconds, as of `elapsedAt` (UTC epoch seconds). */
  elapsed?: number;
  elapsedAt?: number;

  /** Where Music Assistant says it will pick the track up again. Only means anything while stopped. */
  resume?: number;

  /** Where playback was when it stopped: the last position plus the time since it was seen. */
  held?: number;

  /** The track was announced at its start but has not been heard from since, so it may not have started playing:
   * a stop before it is not time it played. Cleared by the first position that is not the start. */
  unconfirmed?: boolean;

  /** What the last track's resume spot was, which a new track starts out carrying for a while. */
  inherited?: number;
}

/** Only `idle` is a stop. Playing, buffering, paused and a state not yet known all follow the counter. */
const following = (playback: string | undefined) => playback !== 'idle';

/** How far before where it was a resumed stream may start, which is not shown as going back. */
const REWIND_SECONDS = 2;

/** How long a player may take to start a track it was told to, whatever it reports meanwhile. */
const START_DELAY_S = 8;

/** A position past this many seconds means the track is playing, and not only announced. */
const STARTED_AFTER_S = 0.05;

/** A queue message: what it says about the track, the counter and the resume position. */
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
  // A different track has nothing to do with where the last one was, and starts out carrying its
  // resume spot, which is not its own.
  const same =
    message.item === undefined || position.item === undefined || message.item === position.item;

  const base: Position = same
    ? position
    : position.resume !== undefined
      ? { inherited: position.resume }
      : {};

  // What the message says about the resume spot, less the old track's number.
  const resume = message.resume !== base.inherited ? message.resume : undefined;
  const { inherited, ...own } = base;
  const stopped = !following(playback);

  // Stopped, a resume spot that goes down is Music Assistant clearing it as playback is about to
  // start, and not where it will resume.
  const spot =
    stopped && resume !== undefined && own.resume !== undefined
      ? Math.max(own.resume, resume)
      : resume;

  const next: Position = {
    ...own,
    ...(message.item !== undefined ? { item: message.item } : {}),
    ...(spot !== undefined ? { resume: spot } : {}),
    // Until the track has a resume spot of its own, the old one is still to be ignored.
    ...(resume === undefined && inherited !== undefined ? { inherited } : {}),
  };

  if (message.elapsed === undefined) {
    return next;
  }

  if (stopped) {
    // Its counter is back at the start: only the first number is of any use.
    return next.elapsed === undefined && next.held === undefined
      ? { ...next, elapsed: message.elapsed, elapsedAt: now }
      : next;
  }

  // Playing: the queue's counter is the truth, apart from the stream starting a moment before the
  // spot it was stopped at, which is not shown as a step back.
  const { held, unconfirmed: _unconfirmed, ...rest } = next;
  const elapsed =
    held !== undefined && message.elapsed >= held - REWIND_SECONDS
      ? Math.max(message.elapsed, held)
      : message.elapsed;

  // A track announced at 0 is not yet known to be playing: the player can take seconds to start it.
  return {
    ...rest,
    elapsed,
    elapsedAt: now,
    ...(message.elapsed < STARTED_AFTER_S ? { unconfirmed: true } : {}),
  };
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

    const playedFor =
      from === 'playing' && position.elapsedAt !== undefined
        ? Math.max(0, now - position.elapsedAt)
        : 0;

    // A stop soon after a track was announced, before it was heard from, is the player not having
    // started it yet: none of that time was played.
    const since = position.unconfirmed === true && playedFor < START_DELAY_S ? 0 : playedFor;

    // The resume spot is of the last stop, and the next one brings its own.
    const { resume: _resume, ...rest } = position;
    return { ...rest, held: position.elapsed + since };
  }

  if (!following(from) && following(to)) {
    // Starting from a stop: from where it was held or, if that stop was not seen, the spot Music
    // Assistant says it will resume at. Its first queue message says where it really starts.
    const origin = position.held ?? position.resume ?? position.elapsed;
    return origin === undefined
      ? position
      : { ...position, held: origin, elapsed: origin, elapsedAt: now };
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
