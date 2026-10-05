# Contributing

Thanks for looking. Hashsome is alpha, so the best first step is to **open a Discussion or an issue**
before a big change: the interfaces are still moving.

## Setup

```bash
corepack enable
pnpm install
pnpm dev                 # the example on mock data
pnpm --filter @hashsome/ui docs   # the component gallery
```

Node is pinned in `package.json` and managed by pnpm, so no nvm is needed.

## Sending a change

1. Fork the repository and branch from `main`.
2. Make the change. Read [ARCHITECTURE.md](ARCHITECTURE.md) before adding a component, a device kind
   or an integration, and [AGENTS.md](AGENTS.md) for the rules (they apply to people as much as to
   agents).
3. Run what CI runs: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and
   `pnpm generate:catalog` if you changed a component's props or doc comment.
4. Open a pull request. **The title must be a conventional commit**, such as
   `feat(ui): add a blinds tile` or `fix(music-assistant): keep the position on pause`. PRs are
   squash-merged, so the title becomes the commit, and releases and the changelog are generated from
   those. CI checks it.

`main` is protected: changes go in through a pull request with passing checks, and releases are cut
by the maintainer.

## Using an AI coding agent

Welcome, and the repo is set up for it: `.claude/skills/` has the workflows for dashboards and
components. Read what the agent wrote before you send it.

## License

By contributing you agree your work is released under [GPL-3.0](LICENSE).
