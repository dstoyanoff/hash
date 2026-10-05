// Node-only and JSX-free on purpose: `hash.config.ts` imports `defineConfig` from here and is
// loaded via a plain Node `import()` in the CLI (see `config.ts`'s `loadConfig()`), which both
// can't transform JSX and runs `config.ts`'s own `node:fs` import for real. Anything browser code
// imports — the React-facing pieces (`createLayout`, ...) —
// lives under the `@hash/runtime/app` subpath instead: importing *anything* from this file pulls
// in the whole module, and `config.ts`'s `node:fs` import throws immediately if that ever reaches
// a browser bundle (Vite externalizes Node builtins client-side as throwing stubs).
export { defineConfig, type HashConfig, type PackageConfig } from './config.ts';
