/** @jsxImportSource @emotion/react */
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { Box, Flex } from 'e-prim';
import { Icon } from '../icon.tsx';
import { Cover } from '../layout/cover.tsx';
import type { SeekHold } from './media-seek.ts';

const SIZE = 168;

/** The player's artwork in a circle, like the one in the bar but larger: an inner outline around
 * it, and an outer ring that shows how far along playback is. With `onSeek` the ring is a slider:
 * drag around it, or use the arrow keys. Not exported from the package: `MediaPlayerColumn` and
 * `MediaPlayerPage` draw it. */
export function ArtworkRing({
  artworkUrl,
  seek,
  duration,
  seekable,
  onOpen,
}: {
  artworkUrl?: string | undefined;

  /** The position to draw and the way to change it, shared with whatever shows the time. */
  seek: SeekHold;

  /** Seconds. Without it the ring is only an outline. */
  duration?: number | undefined;
  seekable: boolean;

  /** Makes the artwork itself a button, for opening something (the library). */
  onOpen?: (() => void) | undefined;
}) {
  const ring = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const total = seekable && duration !== undefined && duration > 0 ? duration : undefined;
  const shown = seek.shown;
  const fraction =
    shown !== undefined && duration ? Math.min(1, Math.max(0, shown / duration)) : undefined;

  /** Where on the ring a pointer is, as a position in the item; `undefined` off the ring. */
  const positionAt = (event: PointerEvent<HTMLDivElement>): number | undefined => {
    const box = ring.current?.getBoundingClientRect();
    if (!box || !duration) {
      return undefined;
    }

    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const turn = Math.atan2(dx, -dy) / (2 * Math.PI);
    return Math.round(((turn + 1) % 1) * duration);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 5 : -5;
    if (
      total === undefined ||
      !['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    seek.commit(Math.min(total, Math.max(0, Math.round((shown ?? 0) + step))));
  };

  return (
    <Box position="relative" width={SIZE} height={SIZE} mx="auto" css={{ flex: 'none' }}>
      <Box
        ref={ring}
        position="absolute"
        cursor={total !== undefined ? 'pointer' : 'default'}
        {...(total !== undefined
          ? {
              role: 'slider',
              tabIndex: 0,
              'aria-label': 'Position',
              'aria-valuemin': 0,
              'aria-valuemax': Math.round(total ?? 0),
              'aria-valuenow': Math.round(shown ?? 0),
              onKeyDown,
              onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
                const box = event.currentTarget.getBoundingClientRect();
                const distance = Math.hypot(
                  event.clientX - (box.left + box.width / 2),
                  event.clientY - (box.top + box.height / 2),
                );

                // Only the ring itself seeks, not the artwork inside it.
                if (distance < box.width * 0.4) {
                  return;
                }

                dragging.current = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                seek.preview(positionAt(event) ?? 0);
              },
              onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
                if (dragging.current) {
                  seek.preview(positionAt(event) ?? 0);
                }
              },
              onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
                if (dragging.current) {
                  dragging.current = false;
                  const next = positionAt(event);
                  if (next !== undefined) {
                    seek.commit(next);
                  }
                }
              },
            }
          : {})}
        css={{ inset: 0, touchAction: 'none' }}
      >
        <svg viewBox="0 0 100 100" width={SIZE} height={SIZE} aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            strokeWidth="3"
            css={({ palette }) => ({ stroke: palette.border })}
          />
          {fraction !== undefined ? (
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${fraction * 100} 100`}
              transform="rotate(-90 50 50)"
              css={({ palette }) => ({ stroke: palette.accent })}
            />
          ) : null}
        </svg>
      </Box>
      <Box position="absolute" radius="full" border css={{ inset: '9%' }} />
      <Flex
        center
        position="absolute"
        radius="full"
        overflow="hidden"
        background="surfaceRaised"
        color="textMuted"
        cursor={onOpen ? 'pointer' : 'inherit'}
        css={{ inset: '14%' }}
        {...(onOpen
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Open media browser',
              title: 'Open media browser',
              onClick: onOpen,
              onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen();
                }
              },
            }
          : {})}
      >
        {artworkUrl ? <Cover src={artworkUrl} /> : <Icon name="lu:music" size={40} />}
      </Flex>
    </Box>
  );
}
