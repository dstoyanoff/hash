import { NavRail, type NavItem } from '@hash/ui';
import { Outlet } from 'react-router';
import { HomeTopBar } from '../../shared/top-bar.tsx';

const items: NavItem[] = [
  { to: '', label: 'Home', icon: 'lu:house' },
  // Routed but not built yet — see pages/coming-soon.tsx.
  { to: 'lights', label: 'Lights', icon: 'lu:lightbulb' },
  { to: 'climate', label: 'Climate', icon: 'lu:thermometer' },
  { to: 'media', label: 'Media', icon: 'lu:music' },
];

/** The home dashboard's own layout: a nav rail, and the shared top bar above whichever page is
 * showing. `showThemeToggle` is a dev convenience — drop it for a real kiosk. */
export const meta = () => [{ title: 'Home' }];

export default function Layout() {
  return (
    <>
      <NavRail items={items} base="/home" showThemeToggle />
      <HomeTopBar title="Home" scenes={['ha:scene.movie_night', 'ha:scene.cooking_time']} />
      <Outlet />
    </>
  );
}
