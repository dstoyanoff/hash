import {
  Dashboard,
  mdiHomeCity,
  mdiStairsUp,
  NavTabs,
  Screen,
  useConnectionStatus,
  useIntegrationStatus,
} from '@hash/ui';
import { Outlet } from 'react-router';
import dashboard from './dashboard.ts';

// `NavLink`'s default route-relative resolution breaks under a pathless layout route (a link's
// base ends up being the *current* leaf route, not the layout's), so tabs use paths anchored to
// the runtime's fixed `/dashboard/{id}` mount contract instead of relative segments.
const base = `/dashboard/${dashboard.id}`;

/** Small dot + label reflecting both the browser<->runtime link and the `ha` backend. */
function ConnectionBadge() {
  const link = useConnectionStatus();
  const ha = useIntegrationStatus('ha');
  const ok = link === 'open' && ha === 'connected';
  const label = link === 'connecting' ? 'Connecting…' : ok ? 'Connected' : 'Offline';
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: 0.8 }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: ok ? '#5fc27a' : '#d9a441',
        }}
      />
      {label}
    </span>
  );
}

/**
 * Shared chrome for every page of this dashboard: title, connection status, and the tab bar
 * that switches between floors. Demonstrates a multi-page dashboard with `NavTabs`.
 */
export default function Layout() {
  return (
    <Dashboard>
      <Screen viewport={{ width: 1024, height: 768 }} scroll>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>Home</h1>
          <ConnectionBadge />
        </header>
        <NavTabs
          items={[
            { to: base, label: 'Downstairs', icon: mdiHomeCity },
            { to: `${base}/upstairs`, label: 'Upstairs', icon: mdiStairsUp },
          ]}
        />
        <Outlet />
      </Screen>
    </Dashboard>
  );
}
