import { useEffect, useRef, useState, type PointerEvent } from 'react';

/** How long a press has to last to count as a hold. The same as a tile's. */
export const HOLD_MS = 500;

/** A finger that moves further than this is scrolling or dragging, not holding. */
const MOVE_TOLERANCE = 10;

/** Calls `onHold` when a press on the element lasts `HOLD_MS`, ignoring presses that start on a
 * button, slider, input or link inside it (those have their own meaning). `holding` is true while
 * the press is being timed, for a progress cue. Spread `handlers` on the element. */
export function useHold(onHold: () => void, enabled: boolean) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const latest = useRef(onHold);
  useEffect(() => {
    latest.current = onHold;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  const cancel = () => {
    clearTimeout(timer.current);
    origin.current = null;
    setHolding(false);
  };

  return {
    holding,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        fired.current = false;
        if (
          !enabled ||
          (event.target as HTMLElement).closest(
            'button, [role="button"], [role="slider"], input, a',
          )
        ) {
          return;
        }

        origin.current = { x: event.clientX, y: event.clientY };
        setHolding(true);
        timer.current = setTimeout(() => {
          fired.current = true;
          cancel();
          latest.current();
        }, HOLD_MS);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const start = origin.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE
        ) {
          cancel();
        }
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,

      /** The click that ends a hold would otherwise also fire whatever it lands on. */
      onClickCapture: (event: { stopPropagation(): void; preventDefault(): void }) => {
        if (fired.current) {
          fired.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      },
    },
  };
}
