---
name: entity-discovery
description: How to find real Home Assistant entity ids and Music Assistant player ids instead of guessing them, and how to get typed autocomplete for HA entities. Use before writing entity refs into a dashboard.
---

# Entity discovery

Dashboards reference devices by entity ref (`ha:light.kitchen_lamp`, or `ma:<player_id>` for a
Music Assistant player talked to directly — see below). Never invent an id — a wrong guess
renders as "Not found" (which is correct behaviour, but not what the user wants).

## List real entities from a live Home Assistant

```bash
HA_URL=http://homeassistant.local:8123 HA_TOKEN=<long-lived token> pnpm --filter @hash/integration-home-assistant states
```

Prints every entity as `<ref>\t<state>`, e.g. `ha:light.kitchen_lamp\ton`. Grep it for the room or
device the user described:

```bash
HA_URL=... HA_TOKEN=... pnpm --filter @hash/integration-home-assistant states | grep -i kitchen
```

**Never ask the user for their long-lived token in chat, and never put a real token in a file that
gets committed.** If you need to run this yourself, ask the user to run the command and paste back
the (non-sensitive) entity list, or to export `HA_URL`/`HA_TOKEN` in their own shell before you run
it there. If no live Home Assistant is reachable, ask the user for the entity ids directly, or use
plausible ids and flag clearly in your reply that they're placeholders the user must correct.

## Generate typed entity refs (optional but recommended)

```bash
HA_URL=... HA_TOKEN=... pnpm --filter @hash/integration-home-assistant states --types > packages/core/src/entities.d.ts
```

This augments `KnownEntities` (see `packages/core/src/entity.ts`) so entity refs autocomplete and
a typo fails typechecking. This does touch `packages/core`, but it's a generated, additive types
file, not a behaviour change — still mention it explicitly to the user rather than doing it
silently, since `dashboard-rules` otherwise forbids touching `packages/*`.

## List real players from a live Music Assistant

For a `MediaPlayerBar`/`usePlayer` backed directly by Music Assistant (not via Home Assistant —
see `packages/integrations/music-assistant`), not a `ha:` ref:

```bash
MA_URL=http://mass.local:8095 MA_TOKEN=<token, from Settings → Profile> pnpm --filter @hash/integration-music-assistant players
```

Prints every player as `<ref>\t<state>\t<now-playing title>`, e.g.
`ma:kitchen_speaker\tplaying\tBlank Space`. The ref's local id is the player's own `player_id`
verbatim — copy it as-is, it isn't `domain.name` like a Home Assistant entity id.

## No live Home Assistant / Music Assistant available

Mock data works everywhere without credentials — used by `examples/home`, the `/gallery` route,
and every `@hash/ui` test. See `MockIntegration` in `packages/core/src/mock.ts` and
`examples/home`'s root `hash.config.ts` entry for the shape (state + attributes per entity id).
Use realistic entity ids and attributes (`supported_color_modes`, `hvac_modes`,
`device_class`/`unit_of_measurement`, ...) so the dashboard's states match what the components
expect — see the component catalog for which attributes each one reads.

## Areas / rooms

`HomeAssistantIntegration.getAreas()` and `.getEntityRegistry()` (in
`packages/integrations/home-assistant/src/index.ts`) return Home Assistant's area registry and the
entity→area/name mapping, useful for grouping a dashboard by room the same way the existing
Lovelace dashboards do. There's no ready-made script for this yet; write a one-off script under
`packages/integrations/home-assistant/scripts/` following `print-states.ts`'s pattern if you need
it, and mention that you added it.

## A third integration

Home Assistant and Music Assistant aren't special-cased anywhere — `@hash/core` only exports the
generic `Integration`/`BaseIntegration` pieces. A new backend is a new package that extends
`BaseIntegration`, picks a unique `id` (its entity-ref prefix), and gets constructed in
`hash.config.ts` like any other — see `packages/integrations/home-assistant` or
`packages/integrations/music-assistant` as a template. The runtime enforces id uniqueness at
startup, so a prefix collision with an existing integration fails fast with a clear error instead
of silently misrouting entities.
