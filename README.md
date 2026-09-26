# hash

Custom smart-home dashboards for Home Assistant, built with React and served by a small Node runtime.

Work in progress — see the milestone issues for the roadmap.

## Development

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm dev        # http://localhost:3000, dashboards from examples/, mock backend
```

Set `HA_URL` and `HA_TOKEN` to talk to a real Home Assistant.

## Run with Docker

```bash
docker compose up --build
```
