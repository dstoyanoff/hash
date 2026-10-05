import { useEffect, useRef, useState } from 'react';
import type { EntityHandle } from '../entity-handle.ts';

/** Unmuting while the level is 0 would restore silence, so it jumps to this instead. */
const UNMUTE_FROM_ZERO = 0.15;

type Handle = EntityHandle<'mediaPlayer'>;

/** The volume of a player as a 0..100 level plus the drag in progress: what to draw, and what a
 * drag, a commit and the mute button each ask the player to do. 0 is mute and anything above it
 * is audible, so a commit can unmute. */
export function useVolumeControl(handle: Handle) {
  const player = handle.entity;
  const level = Math.round((player?.volume ?? 0) * 100);
  const muted = player?.muted === true;
  const [drag, setDrag] = useState<number | null>(null);
  if (drag !== null && drag === level) {
    setDrag(null);
  }

  return {
    level,
    muted,
    shown: drag ?? level,
    drag: setDrag,
    commit: (next: number) => {
      setDrag(next);
      void handle.command('setVolume', { volume: next / 100 });
      if ((next === 0) !== muted) {
        void handle.command('setMuted', { muted: !muted });
      }
    },
    toggleMute: () => {
      if (muted && level === 0) {
        void handle.command('setVolume', { volume: UNMUTE_FROM_ZERO });
      }

      void handle.command('setMuted', { muted: !muted });
    },
  };
}

/** A press that changes nothing visible until the player reports back (a skip) confirms itself:
 * the button dims while the call is in flight, then flashes, or turns red on failure. */
export function usePressFeedback() {
  const [feedback, setFeedback] = useState<{
    key: string;
    state: 'pending' | 'done' | 'error';
  } | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    feedbackFor: (key: string) => (feedback?.key === key ? feedback.state : undefined),
    press: (key: string, action: () => Promise<void>) => {
      clearTimeout(timer.current);
      setFeedback({ key, state: 'pending' });
      action()
        .then(
          () => setFeedback({ key, state: 'done' }),
          () => setFeedback({ key, state: 'error' }),
        )
        .finally(() => {
          timer.current = setTimeout(() => setFeedback(null), 700);
        });
    },
  };
}
