import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests live in packages/* and scripts/ only — example is a consumer project, not something this repo
    // maintains test coverage for.
    projects: ['packages/*', 'scripts'],
    passWithNoTests: true,
  },
});
