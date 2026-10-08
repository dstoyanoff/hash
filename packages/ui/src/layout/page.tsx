/** @jsxImportSource @emotion/react */
import { Flex } from 'e-prim';
import { gridFromDevice } from '../theme/grid.ts';
import { GridOverlay } from './grid-overlay.tsx';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Side = 'left' | 'bottom';

const InsetContext = createContext<((side: Side, size: number) => () => void) | null>(null);

/** Reserves `size` px of the surrounding `Page`'s edge for something fixed over it (`NavRail`,
 * `NavDock`), so content never sits under it. A no-op outside a `Page`. */
export function usePageInset(side: Side, size: number): void {
  const reserve = useContext(InsetContext);
  useLayoutEffect(() => reserve?.(side, size), [reserve, side, size]);
}

export interface PageProps {
  /** The dashboard. */
  children: ReactNode;

  /** Page height. Default `100dvh`: the whole viewport. Only embedding it somewhere smaller (a preview) needs another. */
  height?: string | number;
}

/** The page every dashboard renders into: padded by the density's spacing, a column with gaps,
 * exactly viewport height, and scrolling inside itself (the document never scrolls — the entity
 * drawer is `position: fixed` and relies on that). It pads further for a `NavRail` or `NavDock`
 * the dashboard includes. Render it once, in the app's root layout. `?grid` on the address draws the
 * module grid over it, with every card boxed green or red by whether it sits on the grid (`?grid=off`
 * stops): for laying a dashboard out for one device. */
export function Page({ children, height = '100dvh' }: PageProps) {
  const [insets, setInsets] = useState<Record<Side, number>>({ left: 0, bottom: 0 });
  const reserve = useCallback((side: Side, size: number) => {
    setInsets((current) => ({ ...current, [side]: size }));
    return () => setInsets((current) => ({ ...current, [side]: 0 }));
  }, []);

  const value = useMemo(() => reserve, [reserve]);
  // `?grid` on the address draws the module grid over the page, for laying a dashboard out.
  const [showGrid] = useState(gridFromDevice);

  return (
    <InsetContext.Provider value={value}>
      <Flex
        as="main"
        direction="column"
        height={height}
        overflow="auto"
        position="relative"
        gap={3}
        p={3}
        css={({ spacing }) => ({
          // The padding of one space, plus room for a nav that is fixed over the page.
          paddingLeft: `calc(${spacing(3)} + ${insets.left}px)`,
          paddingBottom: `calc(${spacing(3)} + ${insets.bottom}px)`,
          boxSizing: 'border-box',
        })}
      >
        {children}
        {showGrid ? <GridOverlay /> : null}
      </Flex>
    </InsetContext.Provider>
  );
}
