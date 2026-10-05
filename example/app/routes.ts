import { index, route, type RouteConfig } from '@react-router/dev/routes';

// Every URL in one place. Paths are relative to `app/`; each dashboard is plain code under
// `dashboards/` and owns its layout. A dashboard's entry module exports `meta` for its tab title.
export default [
  route('home', '../dashboards/home/layout.tsx', [
    index('../dashboards/home/pages/home.tsx'),
    route('lights', '../dashboards/home/pages/lights.tsx'),
    route('climate', '../dashboards/home/pages/climate.tsx'),
    route('media', '../dashboards/home/pages/media.tsx'),
  ]),
  route('second-floor', '../dashboards/second-floor/pages/home.tsx'),
  route('kitchen', '../dashboards/kitchen/pages/home.tsx'),
  route('hello', '../dashboards/hello/pages/home.tsx'),
] satisfies RouteConfig;
