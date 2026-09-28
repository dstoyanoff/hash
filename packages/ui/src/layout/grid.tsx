import type { CSSProperties, ReactNode } from 'react';

export interface GridProps {
  /** Number of equal columns. Default 2. */
  columns?: number;
  children: ReactNode;
}

export function Grid({ columns = 2, children }: GridProps) {
  return (
    <div className="hash-grid" style={{ '--hash-grid-columns': columns } as CSSProperties}>
      {children}
    </div>
  );
}
