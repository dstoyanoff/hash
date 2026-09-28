import type { ReactNode } from 'react';
import { Icon } from '../icon.tsx';
import { Grid } from './grid.tsx';

export interface SectionProps {
  title: string;
  /** SVG path, e.g. `mdiSofa`. */
  icon?: string;
  /** Header readouts, typically `<SensorReadout />`s. */
  readouts?: ReactNode;
  /** Grid columns for the body. Default 2. Pass 0 to render children without a grid. */
  columns?: number;
  children?: ReactNode;
}

/** A titled group of tiles, e.g. a room. */
export function Section({ title, icon, readouts, columns = 2, children }: SectionProps) {
  return (
    <section className="hash-section" aria-label={title}>
      <header className="hash-section__header">
        {icon ? <Icon path={icon} /> : null}
        <h2 className="hash-section__title">{title}</h2>
        <span className="hash-section__line" />
        {readouts ? <div className="hash-section__readouts">{readouts}</div> : null}
      </header>
      {children ? columns === 0 ? children : <Grid columns={columns}>{children}</Grid> : null}
    </section>
  );
}
