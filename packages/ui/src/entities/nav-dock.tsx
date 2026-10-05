/** @jsxImportSource @emotion/react */
import { Flex } from 'e-prim';
import { NavLink } from 'react-router';
import { Icon } from '../icon.tsx';
import { usePageInset } from '../layout/page.tsx';
import type { NavItem } from './nav-rail.tsx';
import { useThemeToggle } from '../provider.tsx';

export interface NavDockProps {
  /** The pages to link to; `to` is relative to `base`. */
  items: NavItem[];

  /** Base path items are resolved against, e.g. `/dashboard/home`. */
  base: string;

  /** Adds a light/dark toggle at the end of the dock. Off by default — meant for development or a project that deliberately exposes it, not every kiosk install. */
  showThemeToggle?: boolean;
}

/** Floating bottom pill for switching between a dashboard's pages. Must be rendered inside a
 * router. `position: fixed`, floating over the page; it reserves the space it takes in the
 * surrounding `Page`, which pads for it. */
export function NavDock({ items, base, showThemeToggle }: NavDockProps) {
  usePageInset('bottom', 88);

  return (
    <Flex
      as="nav"
      aria-label="Pages"
      align="center"
      gap={1.5}
      background="rail"
      radius="full"
      p={1.5}
      shadow="drawer"
      position="fixed"
      css={({ spacing }) => ({
        bottom: spacing(5),
        left: '50%',
        transform: 'translateX(-50%)',
      })}
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
              width={44}
              height={44}
              radius="chrome"
              cursor="pointer"
              color={isActive ? 'accentText' : 'line'}
              {...(isActive ? { background: 'accent' } : {})}
            >
              <Icon name={item.icon} size={22} />
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
      css={{ background: 'none' }}
    >
      <Icon name={resolved === 'dark' ? 'lu:moon' : 'lu:sun'} size={22} />
    </Flex>
  );
}
