import type { ReactNode } from 'react';

export interface DashboardProps {
  /** `compact` for small square displays. Default `comfortable`. */
  density?: 'comfortable' | 'compact';
  children: ReactNode;
}

/** Root of a dashboard: applies the design tokens and density. */
export function Dashboard({ density = 'comfortable', children }: DashboardProps) {
  return (
    <div className="hash-dashboard" data-density={density}>
      {children}
    </div>
  );
}
