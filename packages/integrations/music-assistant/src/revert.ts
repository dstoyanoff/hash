/**
 * Music Assistant moves to the next track at once, but a Sonos takes several seconds to follow: it goes
 * on playing the old track, then flips to idle and back, reports the old one again at its own position,
 * and only then starts the new one. Shown as they come, the title changes to a track that is not
 * playing yet, its time waits at 0:00, and the old track comes back for a moment.
 *
 * So this follows what is really playing:
 *  - A new track that has not started (no position past its start while playing) is held: the player
 *    goes on showing the old track, with its title, artwork and running time, until the new one starts.
 *    Everything else about the player (volume, shuffle) is believed.
 *  - Once it has started, a report of the track just left is a flicker and is not believed, a Previous
 *    the user asked for apart.
 *
 * Pure: a state and a report in, a state and what to show out.
 */

/** How long after the new track has really started a report of the one before is taken for a flicker. */
export const REVERT_WINDOW_MS = 15_000;

/** How long it is taken for one while the new track has not started yet: the player can go on with the old one
 * for as long as it takes to load the new one. */
export const UNSTARTED_WINDOW_MS = 60_000;

/** How long the old track is kept on show for a new one that has not started: the longest it is taken
 * to load. After it the new track is shown as it is. */
export const HOLD_MS = 30_000;

export interface Shown<T> {
  /** The track now shown. */
  title?: string | undefined;

  /** The track before it, and when it was left. */
  left?: { title: string; at: number } | undefined;

  /** The track shown has really started. */
  started?: boolean | undefined;

  /** A track announced, not started yet, and when: what is shown stays as it was meanwhile. */
  incoming?: { title: string; at: number } | undefined;

  /** What was shown last for the track shown (not what a held report said). */
  last: T;
}

interface MediaShape {
  media?: { title?: string | undefined } | undefined;
  playback?: string | undefined;
  position?: number | undefined;
  duration?: number | undefined;
  positionUpdatedAt?: string | undefined;
}

/** The report, with the track and where it is, and whether it plays, as they were. */
const asLast = <T extends MediaShape>(report: T, last: T): T => {
  const { media, position, duration, positionUpdatedAt, playback } = last;
  return { ...report, media, position, duration, positionUpdatedAt, playback } as T;
};

/**
 * `allowBack`: the user has just asked to go to the previous track, so going back is what happened.
 * `started`: this report is of a track that plays and is past its start. `hold`: keep the old track
 * on show for a new one that has not started (on by default).
 */
export function onReport<T extends MediaShape>(
  state: Shown<T> | undefined,
  report: T,
  now: number,
  allowBack: boolean,
  started = false,
  hold = true,
): { state: Shown<T>; show: T; held: boolean } {
  const title = report.media?.title;
  if (!state || title === undefined) {
    return {
      state: {
        title: title ?? state?.title,
        left: state?.left,
        incoming: state?.incoming,
        started: state?.started,
        last: report,
      },
      show: report,
      held: false,
    };
  }

  if (state.incoming) {
    const { incoming } = state;
    const late = now - incoming.at >= HOLD_MS;
    if (title === incoming.title && (started || late)) {
      return {
        state: {
          title,
          left: { title: state.title ?? title, at: now },
          started: true,
          last: report,
        },
        show: report,
        held: false,
      };
    }

    if (title !== incoming.title && title !== state.title) {
      // Another track again, before the first started.
      return {
        state: { ...state, incoming: { title, at: incoming.at } },
        show: asLast(report, state.last),
        held: true,
      };
    }

    if (!late) {
      return { state, show: asLast(report, state.last), held: true };
    }

    // It never started: the hold is over, and this is shown as it is.
    return { state: { title, left: state.left, last: report }, show: report, held: false };
  }

  if (title === state.title) {
    return {
      state: { ...state, started: state.started === true || started, last: report },
      show: report,
      held: false,
    };
  }

  const back =
    !allowBack &&
    state.title !== undefined &&
    state.left?.title === title &&
    now - state.left.at < (state.started === true ? REVERT_WINDOW_MS : UNSTARTED_WINDOW_MS);

  if (back) {
    // Everything else about the player is believed: only the track and where it is are kept.
    return { state, show: asLast(report, state.last), held: true };
  }

  if (hold && !started && state.last.playback === 'playing') {
    return {
      state: { ...state, incoming: { title, at: now } },
      show: asLast(report, state.last),
      held: true,
    };
  }

  return {
    state: {
      title,
      ...(state.title !== undefined ? { left: { title: state.title, at: now } } : {}),
      started,
      last: report,
    },
    show: report,
    held: false,
  };
}
