import { useEffect, useRef, useState } from 'react';

/** How long a drag may go without a word before it is given up on: a touch whose end never arrived
 * (cancelled by the browser, the finger lifted off the screen) must not leave the position frozen. */
const IDLE_MS = 8000;

/** The spot being sought to while a drag is in progress, and for a moment after it ends: the
 * player takes a beat to report the new position, and without this the bar would snap back to
 * the old one first. `shown` is what to draw; `preview` follows a drag; `commit` ends it and seeks;
 * `cancel` ends it without seeking (a cancelled or lost touch). A drag that is neither committed nor
 * cancelled expires on its own, so the position can never stay stuck. */
export function useSeekHold(
  position: number | undefined,
  onSeek: ((position: number) => void) | undefined,
) {
  const [drag, setDrag] = useState<number | null>(null);
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(release.current);
      clearTimeout(idle.current);
    },
    [],
  );

  return {
    shown: drag ?? position,
    preview: (next: number) => {
      setDrag(next);
      clearTimeout(idle.current);
      idle.current = setTimeout(() => setDrag(null), IDLE_MS);
    },
    commit: (next: number) => {
      setDrag(next);
      clearTimeout(idle.current);
      clearTimeout(release.current);
      release.current = setTimeout(() => setDrag(null), 1500);
      onSeek?.(next);
    },
    cancel: () => {
      clearTimeout(idle.current);
      clearTimeout(release.current);
      setDrag(null);
    },
  };
}

export type SeekHold = ReturnType<typeof useSeekHold>;
