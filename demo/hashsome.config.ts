import { defineConfig } from '@hashsome/runtime';

// Nothing is served: the demo is a static build, and its devices are mocked in the browser (see
// `app/root.tsx`). `hashsome build` only needs a config to run.
export default defineConfig({ integrations: [] });
