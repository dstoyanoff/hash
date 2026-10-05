import { useEffect, useRef, useState } from 'react';

/** The spot being sought to while a drag is in progress, and for a moment after it ends: the
 * player takes a beat to report the new position, and without this the bar would snap back to
 * the old one first. `shown` is what to draw; `preview` follows a drag; `commit` ends it. */
export function useSeekHold(
  position: number | undefined,
  onSeek: ((position: number) => void) | undefined,
) {
  const [drag, setDrag] = useState<number | null>(null);
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(release.current), []);

  return {
    shown: drag ?? position,
    preview: (next: number) => setDrag(next),
    commit: (next: number) => {
      setDrag(next);
      clearTimeout(release.current);
      release.current = setTimeout(() => setDrag(null), 1500);
      onSeek?.(next);
    },
  };
}

export type SeekHold = ReturnType<typeof useSeekHold>;
