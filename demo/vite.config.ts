import base from '@hashsome/runtime/vite-config';
import { defineConfig, mergeConfig } from 'vite';

// The dashboards are the example's own, so Vite is pointed at them and at the one copy of Emotion
// and e-prim they share with the app.
export default defineConfig(async (env) =>
  mergeConfig(await base(env), {
    base: process.env.DEMO_BASE ?? '/',
    resolve: { dedupe: ['@emotion/react', 'e-prim'] },
    optimizeDeps: { entries: ['../example/dashboards/**/*.{ts,tsx}'] },
  }),
);
