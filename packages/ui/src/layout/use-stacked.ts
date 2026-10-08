import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** How many rows a tile has: one (everything on a line), two (the controls on a second line), or
 * `auto`: two once the tile is narrower than its kind needs for one. */
export type TileRows = 1 | 2 | 'auto';

/** Whether a tile is two rows: always for `2`, never for `1`, and for `auto` while the element in
 * `ref` is narrower than `below` px. Put the ref on something as wide as the tile (its parent cell);
 * it is only watched for `auto`. Measured before the first paint, so a narrow tile is never seen as
 * one row first. */
export function useStacked(
  rows: TileRows,
  below: number,
): [ref: RefObject<HTMLDivElement | null>, stacked: boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (rows !== 'auto' || !element) {
      return;
    }

    const measure = () => setNarrow(element.getBoundingClientRect().width < below);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [rows, below]);

  return [ref, rows === 2 || (rows === 'auto' && narrow)];
}
