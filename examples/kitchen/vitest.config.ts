import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: 'example-kitchen', environment: 'jsdom', include: ['src/**/*.test.tsx'] },
});
