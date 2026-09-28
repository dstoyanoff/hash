import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'example-home', environment: 'jsdom', include: ['src/**/*.test.tsx'] },
});
