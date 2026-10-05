import type { MediaPlayerEntity } from '@hashsome/core';
import { useEffect, useState } from 'react';

/** `m:ss`, or `h:mm:ss` from an hour up. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

/** Where playback is now. The player reports a position as of a moment; while it plays, this
 * moves it forward from there on its own clock, so the bar advances without a message per second.
 * `undefined` until the player reports a position. */
export function useMediaPosition(player: MediaPlayerEntity | undefined): number | undefined {
  const playing = player?.playback === 'playing';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing) {
      return;
    }

    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [playing]);

  if (player?.position === undefined) {
    return undefined;
  }

  const since = player.positionUpdatedAt ? Date.parse(player.positionUpdatedAt) : Number.NaN;
  const elapsed = playing && Number.isFinite(since) ? Math.max(0, (now - since) / 1000) : 0;
  const position = player.position + elapsed;
  return player.duration === undefined ? position : Math.min(player.duration, position);
}
