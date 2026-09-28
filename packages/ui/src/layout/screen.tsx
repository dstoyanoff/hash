import type { CSSProperties, ReactNode } from 'react';

export interface ScreenProps {
  /** Target device size in CSS px; the screen is capped to it and centered on larger displays. */
  viewport?: { width: number; height: number };
  /** Allow vertical scrolling. Default `false`: kiosk screens fit the display exactly. */
  scroll?: boolean;
  children: ReactNode;
}

/** One full page of a dashboard. */
export function Screen({ viewport, scroll = false, children }: ScreenProps) {
  const style: CSSProperties | undefined = viewport
    ? { maxWidth: viewport.width, ...(scroll ? {} : { maxHeight: viewport.height }) }
    : undefined;
  return (
    <div
      className="hash-screen"
      data-scroll={scroll}
      data-fixed={viewport !== undefined}
      style={style}
    >
      {children}
    </div>
  );
}
