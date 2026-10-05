import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'app',
  buildDirectory: 'build',
  ssr: false,
  // Where the site is served from, e.g. `/hashsome/demo/` on GitHub Pages.
  basename: process.env.DEMO_BASE ?? '/',
} satisfies Config;
