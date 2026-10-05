import { describe, expect, test } from 'vitest';
import { UnknownEntityError } from './entity.ts';
import type { Integration } from './integration.ts';
import { COMMAND_NAMES, type Entity, type EntityKind } from './model/index.ts';

export interface ConformanceOptions {
  /** Shown in test names, e.g. `Home Assistant`. */
  name: string;

  /** The id the integration uses unless told otherwise (`ha`, `ma`). */
  defaultId: string;

  /** Builds the integration's mock, with the integration's own representative devices. */
  createMock: (options?: { id?: string }) => Integration;

  /** Every kind the real integration can produce; the mock has to cover all of them. */
  kinds: readonly EntityKind[];
}

const AVAILABILITY = ['ready', 'unavailable', 'unknown'];

/**
 * The checks every integration's mock must pass, so a project can try any device without a
 * backend. Run it from the integration package's own tests:
 *
 *     runIntegrationConformance({ name, defaultId, kinds, createMock });
 *
 * Imports `vitest`, which is why it lives behind its own `@hashsome/core/conformance` entry point.
 */
export function runIntegrationConformance(options: ConformanceOptions): void {
  const { name, defaultId, createMock, kinds } = options;

  describe(`${name} mock conformance`, () => {
    test('uses the integration’s default id, and accepts another one', () => {
      expect(createMock().id).toBe(defaultId);
      expect(createMock({ id: 'other' }).id).toBe('other');
    });

    test('connects, and then lists a representative set of entities', async () => {
      const mock = createMock();
      await mock.connect();
      expect(mock.status).toBe('connected');
      expect(mock.listEntities().length).toBeGreaterThan(0);
    });

    test('covers every kind the integration can produce', async () => {
      const mock = createMock();
      await mock.connect();
      const present = new Set(mock.listEntities().map((entity) => entity.kind));
      expect(kinds.filter((kind) => !present.has(kind))).toEqual([]);
    });

    test('every entity is valid for its kind, and addressed by this integration', async () => {
      const mock = createMock();
      await mock.connect();
      const problems: string[] = [];
      for (const entity of mock.listEntities()) {
        if (!entity.ref.startsWith(`${mock.id}:`)) {
          problems.push(`${entity.ref}: not addressed by "${mock.id}"`);
        }

        if (!Object.keys(COMMAND_NAMES).includes(entity.kind)) {
          problems.push(`${entity.ref}: unknown kind "${entity.kind}"`);
        }

        if (entity.name.length === 0) {
          problems.push(`${entity.ref}: empty name`);
        }

        if (!AVAILABILITY.includes(entity.availability)) {
          problems.push(`${entity.ref}: bad availability "${entity.availability}"`);
        }

        if (mock.getEntity(localId(mock.id, entity)) !== entity) {
          problems.push(`${entity.ref}: getEntity does not return the listed entity`);
        }
      }

      expect(problems).toEqual([]);
    });

    test('includes an unavailable device, so a dashboard can show that state', async () => {
      const mock = createMock();
      await mock.connect();
      expect(mock.listEntities().some((entity) => entity.availability === 'unavailable')).toBe(
        true,
      );
    });

    test('subscribe delivers the current entity at once, and throws for an unknown id', async () => {
      const mock = createMock();
      await mock.connect();
      const [first] = mock.listEntities();
      expect(first).toBeDefined();
      const seen: (Entity | undefined)[] = [];
      mock.subscribe(localId(mock.id, first as Entity), (entity) => seen.push(entity))();
      expect(seen).toEqual([first]);
      let thrown: unknown;
      try {
        mock.subscribe('does-not-exist', () => {});
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(UnknownEntityError);
    });

    test('commands reject for an unknown entity and for a command the kind does not define', async () => {
      const mock = createMock();
      await mock.connect();
      await expect(mock.command('does-not-exist', 'toggle')).rejects.toThrow(/does-not-exist/);
      const [first] = mock.listEntities();
      await expect(
        mock.command(localId(mock.id, first as Entity), 'definitely-not-a-command'),
      ).rejects.toThrow(/definitely-not-a-command/);
    });

    test('every command of a kind with commands runs on an entity of that kind', async () => {
      const mock = createMock();
      await mock.connect();
      const failures: string[] = [];
      for (const entity of mock.listEntities()) {
        if (entity.availability !== 'ready') {
          continue;
        }

        const argsFor = SAMPLE_ARGS[entity.kind] ?? {};
        for (const command of COMMAND_NAMES[entity.kind]) {
          if (command === 'playMedia') {
            continue; // needs a real item id; the library test above plays one
          }

          try {
            await mock.command(localId(mock.id, entity), command, argsFor[command]);
          } catch (error) {
            failures.push(`${entity.ref} ${command}: ${String(error)}`);
          }
        }
      }

      expect(failures).toEqual([]);
    });

    test('a player that reports a library can be browsed, searched and played from', async () => {
      const mock = createMock();
      await mock.connect();
      const failures: string[] = [];
      for (const entity of mock.listEntities()) {
        if (entity.kind !== 'mediaPlayer' || !entity.capabilities.browse) {
          continue;
        }

        const id = localId(mock.id, entity);
        if (!mock.browse) {
          failures.push(`${entity.ref}: reports browse but the integration has no browse()`);
          continue;
        }

        const root = await mock.browse(id, {});
        if (root.items.length === 0) {
          failures.push(`${entity.ref}: the top level of the library is empty`);
        }

        for (const item of root.items) {
          if (item.title === '' || item.id === '') {
            failures.push(`${entity.ref}: an item has no id or title`);
          }
        }

        const folder = root.items.find((item) => item.expandable);
        if (folder) {
          const inside = await mock.browse(id, { path: folder.id });
          if (inside.items.length === 0) {
            failures.push(`${entity.ref}: "${folder.title}" lists nothing`);
          }
        }

        const playable = await firstPlayable(mock, id);
        if (!playable) {
          failures.push(`${entity.ref}: nothing in the library can be played`);
        } else {
          try {
            await mock.command(id, 'playMedia', { item: playable });
          } catch (error) {
            failures.push(`${entity.ref} playMedia: ${String(error)}`);
          }
        }

        if (entity.capabilities.search) {
          const found = await mock.browse(id, { search: root.items[0]?.title.slice(0, 3) ?? 'a' });
          if (!Array.isArray(found.items)) {
            failures.push(`${entity.ref}: search did not return a list`);
          }
        }
      }

      expect(failures).toEqual([]);
    });

    test('the mock never carries credentials', async () => {
      const mock = createMock();
      await mock.connect();
      expect(JSON.stringify(mock.listEntities())).not.toMatch(/token|password|secret/i);
    });
  });
}

const localId = (integrationId: string, entity: Entity): string =>
  entity.ref.slice(integrationId.length + 1);

/** Arguments that make each command valid, for the commands that take any. */
const SAMPLE_ARGS: Partial<Record<EntityKind, Record<string, Record<string, unknown>>>> = {
  mediaPlayer: { setVolume: { volume: 0.5 }, setMuted: { muted: true }, seek: { position: 30 } },
  light: {
    setBrightness: { brightness: 0.5 },
    setColorTemperature: { kelvin: 3000 },
    setColor: { hue: 120, saturation: 80 },
  },
  climate: {
    setMode: { mode: 'off' },
    setTargetTemperature: { temperature: 20 },
    setPreset: { preset: 'home' },
  },
};

/** The id of the first playable item found by walking the library, a few levels down. */
async function firstPlayable(
  integration: Integration,
  entityId: string,
  path?: string,
  depth = 0,
): Promise<string | undefined> {
  if (!integration.browse || depth > 3) {
    return undefined;
  }

  const level = await integration.browse(entityId, path === undefined ? {} : { path });
  const direct = level.items.find((item) => item.playable && !item.expandable);
  if (direct) {
    return direct.id;
  }

  for (const item of level.items.filter((candidate) => candidate.expandable)) {
    const found = await firstPlayable(integration, entityId, item.id, depth + 1);
    if (found) {
      return found;
    }
  }

  return undefined;
}
