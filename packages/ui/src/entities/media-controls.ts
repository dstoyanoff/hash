import { useEffect, useRef, useState } from 'react';
import type { EntityRef } from '@hashsome/core';
import type { EntityHandle } from '../entity-handle.ts';
import type { MediaPlayerEntity, QueueResult } from '@hashsome/core';
import { useMediaQueue } from '../use-media-queue.ts';
import { trackMedia, useMediaPending } from './media-pending.ts';

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

/** A press that changes nothing visible until the player takes it up (play, pause, a skip, shuffle) shows it is
 * waiting: the button is pending (a ring turns around it and it cannot be pressed again) until the player
 * has changed, or turns red when the request fails. The pending part is shared per player, so every control
 * of it agrees. */
export function usePressFeedback(ref: EntityRef | undefined) {
  const waiting = useMediaPending(ref);
  const [failed, setFailed] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    feedbackFor: (key: string): 'pending' | 'error' | undefined =>
      waiting.some((entry) => entry.kind === key)
        ? 'pending'
        : failed === key
          ? 'error'
          : undefined,
    press: (key: string, action: () => Promise<void>) => {
      clearTimeout(timer.current);
      setFailed(null);
      const request = action();
      if (ref) {
        trackMedia(ref, { kind: key }, request);
      }

      request.catch(() => {
        setFailed(key);
        timer.current = setTimeout(() => setFailed(null), 700);
      });
    },
  };
}

/** Past this far into a track, Previous restarts it, so it has somewhere to go even on the first one. */
const RESTART_AFTER_S = 3;

/** What the transport buttons can do now, from the queue: Next when something comes after the track playing,
 * Previous when something comes before it (or the track is far enough in to restart), Play when there is
 * something loaded or queued. Without a queue to read (a player with none, or before it answers) nothing
 * is held back: a button is only disabled for what is known. */
export function transportAvailability(
  queue: QueueResult | undefined,
  player: MediaPlayerEntity | undefined,
  position: number | undefined,
) {
  const current = queue ? queue.items.findIndex((item) => item.current === true) : -1;
  const known = queue !== undefined && current >= 0;
  const index = known ? queue.offset + current : 0;
  return {
    next: !known || index + 1 < queue.total,
    previous: !known || index > 0 || (position ?? 0) >= RESTART_AFTER_S,
    play:
      queue === undefined ||
      queue.total > 0 ||
      player?.media?.title !== undefined ||
      player?.playback === 'playing',
  };
}

export function useTransportAvailability(
  player: MediaPlayerEntity | undefined,
  position: number | undefined,
) {
  const { queue } = useMediaQueue(player?.ref);
  return transportAvailability(queue, player, position);
}
