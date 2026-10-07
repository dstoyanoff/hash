/** @jsxImportSource @emotion/react */
import { Flex } from 'e-prim';
import { NavLink } from 'react-router';
import type { IconName } from '../icon-data.ts';
import { Icon } from '../icon.tsx';
import { usePageInset } from '../layout/page.tsx';
import { useThemeToggle } from '../provider.tsx';

export interface NavItem {
  /** Route path relative to `base`, e.g. `''` (the dashboard's home) or `'lights'`. */
  to: string;
  label: string;
  icon: IconName;
}

export interface NavRailProps {
  /** The pages to link to; `to` is relative to `base`. */
  items: NavItem[];

  /** Base path items are resolved against, e.g. `/home`. */
  base: string;

  /** Adds a light/dark toggle at the bottom of the rail. Off by default — meant for development or a project that deliberately exposes it, not every kiosk install. */
  showThemeToggle?: boolean;

  /** A narrower rail for a small display: 48px wide instead of 76, with smaller markers, so the page keeps more of its width. Default `false`. */
  compact?: boolean;
}

/** What the rail is made of, in its two sizes: its width, the marker beside each page, and its icon. */
const SIZES = {
  regular: { rail: 76, marker: 44, icon: 22, gap: 2.5, py: 6 },
  compact: { rail: 48, marker: 36, icon: 18, gap: 2, py: 4 },
} as const;

/** Fixed left sidebar for switching between a dashboard's pages. Must be rendered inside a
 * router. It is `position: fixed` and reserves its width in the surrounding `Page`, which pads
 * for it so content never sits under it. */
export function NavRail({ items, base, showThemeToggle, compact = false }: NavRailProps) {
  const size = SIZES[compact ? 'compact' : 'regular'];
  usePageInset('left', size.rail);

  return (
    <Flex
      as="nav"
      aria-label="Pages"
      direction="column"
      align="center"
      gap={size.gap}
      background="rail"
      width={size.rail}
      py={size.py}
      position="fixed"
      zIndex="nav"
      css={{ top: 0, bottom: 0, left: 0 }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to ? `${base}/${item.to}` : base}
          end
          aria-label={item.label}
          title={item.label}
        >
          {({ isActive }) => (
            <Flex
              as="span"
              align="center"
              justify="center"
              width={size.marker}
              height={size.marker}
              radius="chrome"
              cursor="pointer"
              color={isActive ? 'accentText' : 'line'}
              {...(isActive ? { background: 'accent' } : {})}
            >
              <Icon name={item.icon} size={size.icon} />
            </Flex>
          )}
        </NavLink>
      ))}
      {showThemeToggle ? <ThemeToggleButton size={size} /> : null}
    </Flex>
  );
}

function ThemeToggleButton({ size }: { size: { marker: number; icon: number } }) {
  const { resolved, toggle } = useThemeToggle();
  return (
    <Flex
      as="button"
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
      align="center"
      justify="center"
      width={size.marker}
      height={size.marker}
      radius="chrome"
      cursor="pointer"
      color="line"
      css={{ background: 'none', marginTop: 'auto' }}
    >
      <Icon name={resolved === 'dark' ? 'lu:moon' : 'lu:sun'} size={size.icon} />
    </Flex>
  );
}
