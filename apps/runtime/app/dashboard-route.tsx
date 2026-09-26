import type { DashboardManifest } from '@hash/core';
import { useEffect } from 'react';
import { useRoutes, type RouteObject } from 'react-router';

export function dashboardMeta(manifest: DashboardManifest) {
  return () => [
    { title: manifest.title },
    ...(manifest.viewport
      ? [
          {
            name: 'viewport',
            content: `width=${manifest.viewport.width}, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`,
          },
        ]
      : []),
  ];
}

/** Keeps the screen on while a dashboard is open (best effort; unsupported browsers ignore it). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let cancelled = false;
    const request = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {});
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);
}

/** Mounts a dashboard's child routes under `/dashboard/{id}/*`. */
export function createDashboardRoute(_manifest: DashboardManifest, routes: RouteObject[]) {
  return function DashboardRoute() {
    useWakeLock();
    return useRoutes(routes);
  };
}
