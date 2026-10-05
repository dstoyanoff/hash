/** @jsxImportSource @emotion/react */
import { createElement } from 'react';
import { ICON_NODES, type IconName } from './icon-data.ts';

export interface IconProps {
  /** Prefixed icon id, e.g. `lu:lightbulb`, `tb:vacuum-cleaner`. */
  name: IconName;

  /** Overrides the density's icon size, in px. */
  size?: number;
}

const STROKE_WIDTH = 1.5;

/** Packs whose icons are drawn as outlines (`fill: none`, shapes stroked in). A pack not listed
 * here (e.g. a future filled pack) renders solid instead. */
const STROKE_PACKS = new Set(['lu', 'tb']);

/** An inline SVG icon, from a plain prefixed id (`lu:` Lucide, `tb:` Tabler outline). Takes the surrounding text color. */
export function Icon({ name, size }: IconProps) {
  const stroke = STROKE_PACKS.has(name.slice(0, name.indexOf(':')));
  const nodes = ICON_NODES[name];
  if (!nodes) {
    console.warn(`Could not find icon "${name}"`);
  }

  return (
    <svg
      viewBox="0 0 24 24"
      css={({ density }) => ({
        width: size ?? density.iconSize,
        height: size ?? density.iconSize,
        flex: 'none',
      })}
      fill={stroke ? 'none' : 'currentColor'}
      {...(stroke
        ? {
            stroke: 'currentColor',
            strokeWidth: STROKE_WIDTH,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }
        : {})}
      aria-hidden="true"
    >
      {(nodes ?? []).map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
