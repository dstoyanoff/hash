export interface DashboardViewport {
  /** Target screen size in CSS pixels. */
  width: number;
  height: number;
}

export interface DashboardManifest {
  /** URL-safe id; the dashboard is served at `/dashboard/{id}`. Must match its folder name. */
  id: string;
  title: string;
  viewport?: DashboardViewport;
}

/** Identity helper that gives `dashboard.ts` files type checking. */
export function defineDashboard<T extends DashboardManifest>(manifest: T): T {
  return manifest;
}
