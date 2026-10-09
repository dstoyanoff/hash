/** @jsxImportSource @emotion/react */
import { Flex } from 'e-prim';
import { NavLink } from 'react-router';
import type { IconName } from '../icon-data.ts';
import { Icon } from '../icon.tsx';
import { usePageInset } from '../layout/page.tsx';
import { useThemeToggle } from '../provider.tsx';
import { AttentionDot } from './attention-dot.tsx';

export interface NavItem {
  /** Route path relative to `base`, e.g. `''` (the dashboard's home) or `'lights'`. */
  to: string;
  label: string;
  icon: IconName;

  /** A dot on the item for something on that page that needs a look: `notice` (warm) or `urgent` (red). Nothing by default. */
  attention?: 'notice' | 'urgent';
}

export interface NavRailProps {
  /** The pages to link to; `to` is relative to `base`. */
  items: NavItem[];

  /** Base path items are resolved against, e.g. `/home`. */
  base: string;

  /** Adds a light/dark toggle at the bottom of the rail. Off by default — meant for development or a project that deliberately exposes it, not every kiosk install. */
  showThemeToggle?: boolean;
}

/** Fixed left sidebar for switching between a dashboard's pages. Must be rendered inside a
 * router. It is `position: fixed` and reserves its width in the surrounding `Page`, which pads
 * for it so content never sits under it. */
export function NavRail({ items, base, showThemeToggle }: NavRailProps) {
  usePageInset('left', 76);

  return (
    <Flex
      as="nav"
      aria-label="Pages"
      direction="column"
      align="center"
      gap={2.5}
      background="rail"
      width={76}
      py={6}
      position="fixed"
      zIndex="nav"
      css={{ top: 0, bottom: 0, left: 0 }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to ? `${base}/${item.to}` : base}
          end
          aria-label={item.attention ? `${item.label}, needs attention` : item.label}
          title={item.label}
        >
          {({ isActive }) => (
            <Flex
              as="span"
              align="center"
              justify="center"
              width={44}
              height={44}
              radius="chrome"
              cursor="pointer"
              position="relative"
              color={isActive ? 'accentText' : 'line'}
              {...(isActive ? { background: 'accent' } : {})}
            >
              <Icon name={item.icon} size={22} />
              {item.attention ? <AttentionDot level={item.attention} /> : null}
            </Flex>
          )}
        </NavLink>
      ))}
      {showThemeToggle ? <ThemeToggleButton /> : null}
    </Flex>
  );
}

function ThemeToggleButton() {
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
      width={44}
      height={44}
      radius="chrome"
      cursor="pointer"
      color="line"
      css={{ background: 'none', marginTop: 'auto' }}
    >
      <Icon name={resolved === 'dark' ? 'lu:moon' : 'lu:sun'} size={22} />
    </Flex>
  );
}
