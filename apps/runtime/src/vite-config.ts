import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

/**
 * Loaded through the generated `<root>/.hash/vite.config.ts` (the React Router
 * plugin requires a config file). Server settings and the dev proxy are supplied
 * inline by the CLI.
 */
export default defineConfig({
  plugins: [reactRouter()],
  // React Router's SPA prerender starts a private preview server; pin it to IPv4 so it is
  // reachable in containers where `localhost` resolves to ::1.
  preview: { host: '127.0.0.1' },
  resolve: {
    // One copy of these across the runtime app and the instance's dashboards.
    dedupe: ['react', 'react-dom', 'react-router', '@hash/core', '@hash/ui'],
  },
});
