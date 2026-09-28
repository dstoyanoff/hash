# hash

[![CI](https://github.com/dstoyanoff/hash/actions/workflows/ci.yml/badge.svg)](https://github.com/dstoyanoff/hash/actions/workflows/ci.yml)

**Your own smart-home dashboards, built like software.** No drag-and-drop card editor — a real
design system, real components, real tests, served from a small Docker container to whatever
screen you point it at (a wall-mounted tablet, a Shelly display, a phone). Home Assistant is the
default backend, but nothing here is tied to it.

The twist: **this repo is built to be extended by an AI coding agent, not just by hand.** Every
dashboard follows a small set of strict rules (see [Agent-first](#agent-first-how-dashboards-get-built)
below), so an agent like Claude Code can be handed "build me a dashboard for the kitchen" and
produce something that fits the design system, renders correctly, and comes with tests — without
ever touching the parts of the codebase it shouldn't.

## What's actually in here

```
packages/
  core/       @hash/core     — integrations (Home Assistant, ...), entity types, no React
  ui/         @hash/ui       — the design system: tiles, layout, hooks. Framework for the eye.
apps/
  runtime/    @hash/runtime  — the server + CLI that discovers and serves dashboards
examples/
  hello/                     — a minimal one-button demo
  home/                      — a real, two-page, multi-room reference dashboard
  kitchen/                   — a second worked example
templates/
  dashboard/                 — the scaffold new dashboards are copied from
```

A dashboard is just a small React package living under `examples/<id>/`. The runtime finds every
one of them at build time and serves it at `/dashboard/<id>` — open `/` for an index of everything
currently installed. Nothing about a dashboard is hand-wired into the server; add a folder, and
it's live.

## Quickstart

### For a human

```bash
git clone https://github.com/dstoyanoff/hash.git
cd hash
corepack enable        # gets you the right pnpm
pnpm install
pnpm dev
```

Open **http://localhost:3000** — you'll see the example dashboards, running against fake
("mock") data so there's something to click even without a real smart home connected. Try
**http://localhost:3000/gallery** too: every component in every state (on, off, dimming,
unavailable, ...), the same reference an agent uses when building a page.

Want it talking to your real Home Assistant instead of mock data?

```bash
HA_URL=http://homeassistant.local:8123 HA_TOKEN=<a long-lived access token> pnpm dev
```

(Home Assistant → your profile → **Long-Lived Access Tokens** → _Create Token_.)

### For your agent

If you're using Claude Code (or another coding agent) and just want this running as fast as
possible, paste this in:

> Clone `https://github.com/dstoyanoff/hash.git`, enable corepack, run `pnpm install`, then run
> `pnpm dev` in the background and open http://localhost:3000/gallery for me so I can see it's
> working.

Once it's running, the fastest way to get your own dashboard is to just ask for it — the agent
already has everything it needs from the skills in `.claude/skills/`:

> Create a dashboard for my [kitchen / living room / bathroom / whatever]. It's a
> [tablet mounted on the wall / small square Shelly-style display / ...]. Devices: [list your
> lights, thermostats, sensors, scenes — or say you don't have a live Home Assistant yet and it'll
> use realistic placeholder data].

That one request runs the whole `create-dashboard` workflow: scaffolding the package, looking up
real entity ids (or using sensible mock ones), composing the page from the design system, writing
tests, and checking it all actually renders — see [Agent-first](#agent-first-how-dashboards-get-built).

## Running it for real

```bash
docker compose up --build
```

Set `HA_URL`/`HA_TOKEN` in a `.env` file next to `docker-compose.yml` (or in your shell) to point
it at a real Home Assistant; leave them unset to keep using mock data. Point a tablet's browser
(or a kiosk app) at `http://<the machine running this>:3000/dashboard/<id>`.

The container only serves static files plus one WebSocket connection — your Home Assistant token
lives on the server, never on the tablet.

## Agent-first: how dashboards get built

A dashboard package can only import `react`, `react-router`, `@hash/ui` and `@hash/core` —
enforced by lint, not just convention. That constraint is what makes it safe to hand dashboard
work to an agent: it physically cannot reach into the server or the design system while building
one, so "create a dashboard" can never turn into "also refactored the runtime." If a dashboard
genuinely needs something the design system doesn't have yet, that's a separate, explicit,
reviewable change (see the `add-ui-component` skill).

Everything an agent needs to do this well lives in `.claude/skills/`:

| Skill              | What it's for                                                                   |
| ------------------ | ------------------------------------------------------------------------------- |
| `create-dashboard` | The end-to-end process for a new dashboard                                      |
| `dashboard-rules`  | The hard constraints, plus every sharp edge found building the real examples    |
| `entity-discovery` | Finding real Home Assistant entity ids instead of guessing                      |
| `ui-catalog`       | Every component, its props, generated straight from source so it can't go stale |
| `verify-dashboard` | How to actually check the result works before calling it done                   |
| `add-ui-component` | The stricter, separate workflow for extending the design system itself          |

These were refined by actually using them — including a dry run where an agent was handed nothing
but "create a kitchen dashboard" and the resulting friction was fed back into the skills. They're
also just good docs for a human doing the same work by hand.

## Development

```bash
pnpm lint             # oxlint
pnpm format:check     # prettier (pnpm format to fix)
pnpm typecheck
pnpm test             # vitest, every package
pnpm validate:dashboards   # shape/id/viewport checks on every dashboard
pnpm generate:catalog      # regenerate the UI catalog after changing a component
```

Node is pinned (`devEngines.runtime` in `package.json`) and managed by pnpm — no nvm needed;
`corepack enable` gets you the matching pnpm version automatically.

More detail on the layout and rules lives in [`AGENTS.md`](AGENTS.md) (also read by Claude Code as
`CLAUDE.md`).

## Status

Actively under construction — milestones are tracked as
[GitHub issues](https://github.com/dstoyanoff/hash/issues). Not yet published as installable
packages; today, using this means cloning the repo and adding your own dashboards under
`examples/`.

## License

[GPL-3.0](LICENSE).
