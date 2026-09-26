import type { DashboardManifest } from '@hash/core';

export function createHome(dashboards: DashboardManifest[]) {
  return function Home() {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Dashboards</h1>
        {dashboards.length === 0 && <p>No dashboards found.</p>}
        <ul>
          {dashboards.map((d) => (
            <li key={d.id}>
              <a href={`/dashboard/${d.id}`} style={{ color: 'inherit' }}>
                {d.title}
              </a>
            </li>
          ))}
        </ul>
      </main>
    );
  };
}
