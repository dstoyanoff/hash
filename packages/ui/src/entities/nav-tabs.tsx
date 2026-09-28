import { NavLink } from 'react-router';
import { Icon } from '../icon.tsx';

export interface NavTabItem {
  /** Route path relative to the dashboard, e.g. `''` (home) or `'bedroom'`. */
  to: string;
  label: string;
  /** SVG path. */
  icon: string;
}

export interface NavTabsProps {
  items: NavTabItem[];
}

/** Icon tab bar for switching between a dashboard's pages. Must be rendered inside a router. */
export function NavTabs({ items }: NavTabsProps) {
  return (
    <nav className="hash-tabs" aria-label="Pages">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className="hash-tabs__link"
          aria-label={item.label}
          title={item.label}
        >
          <Icon path={item.icon} />
        </NavLink>
      ))}
    </nav>
  );
}
