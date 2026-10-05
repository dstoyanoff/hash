import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Standalone dev server for the component gallery (`pnpm docs`) — entirely decoupled from
// `apps/runtime` and any project's own routing, since this documents `@hash/ui` itself.
export default defineConfig({
  root: 'docs',
  plugins: [react()],
});
