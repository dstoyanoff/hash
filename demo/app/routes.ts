import { index, route, type RouteConfig } from '@react-router/dev/routes';

// The example's dashboards, unchanged, under the same URLs.
export default [
  index('./start.tsx'),
  route('home', '../../example/dashboards/home/layout.tsx', [
    index('../../example/dashboards/home/pages/home.tsx'),
    route('lights', '../../example/dashboards/home/pages/lights.tsx'),
    route('climate', '../../example/dashboards/home/pages/climate.tsx'),
    route('media', '../../example/dashboards/home/pages/media.tsx'),
    route('weather', '../../example/dashboards/home/pages/weather.tsx'),
  ]),
  route('second-floor', '../../example/dashboards/second-floor/pages/home.tsx'),
  route('kitchen', '../../example/dashboards/kitchen/pages/home.tsx'),
  route('hello', '../../example/dashboards/hello/pages/home.tsx'),
] satisfies RouteConfig;
