import { TopBar, type TopBarProps } from '@hash/ui';
import { switchableDashboards } from './dashboards.ts';

/** This home's top bar: the same weather, presence, clock and dashboard switcher on every
 * dashboard that includes it. Also just a convention — a dashboard that wants a different bar (or
 * none) simply doesn't use this. Each dashboard supplies its own title and scene shortcuts. */
export function HomeTopBar({ title, scenes }: Pick<TopBarProps, 'scenes'> & { title: string }) {
  return (
    <TopBar
      title={title}
      dashboards={switchableDashboards}
      {...(scenes ? { scenes } : {})}
      weather="ha:sensor.outdoor_temperature"
      people={['ha:person.dan', 'ha:person.alex']}
      clockFormat="24h"
    />
  );
}
