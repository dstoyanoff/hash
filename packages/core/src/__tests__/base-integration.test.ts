import { describe, expect, test, vi } from 'vitest';
import { BaseIntegration } from '../base-integration.ts';
import { UnknownEntityError } from '../entity.ts';
import type { Entity, EntityInput } from '../model/index.ts';

const sensor = (value: string): EntityInput => ({
  kind: 'sensor',
  name: 'S',
  availability: 'ready',
  value,
});

class Fake extends BaseIntegration {
  readonly id = 'fk';
  connect() {
    this.setStatus('connected');
    return Promise.resolve();
  }
  disconnect() {
    this.setStatus('disconnected');
  }
  command() {
    return Promise.resolve();
  }
  put(id: string, input: EntityInput | undefined) {
    this.setEntity(id, input);
  }
  replace(entries: Record<string, EntityInput>) {
    this.replaceEntities(new Map(Object.entries(entries)));
  }
}

describe('BaseIntegration', () => {
  test('stamps the ref onto stored entities', () => {
    const fake = new Fake();
    fake.put('a', sensor('1'));
    expect(fake.getEntity('a')?.ref).toBe('fk:a');
    expect(fake.listEntities().map((e) => e.ref)).toEqual(['fk:a']);
  });

  test('subscribe throws for an unknown id, delivers the current entity at once, then changes', () => {
    const fake = new Fake();
    expect(() => fake.subscribe('a', () => {})).toThrow(UnknownEntityError);
    fake.put('a', sensor('1'));
    const listener = vi.fn<(entity: Entity | undefined) => void>();
    fake.subscribe('a', listener);
    expect(listener).toHaveBeenCalledTimes(1);
    fake.put('a', sensor('2'));
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ value: '2' }));
    fake.put('a', undefined);
    expect(listener).toHaveBeenLastCalledWith(undefined);
  });

  test('unsubscribing is safe to repeat and stops notifications', () => {
    const fake = new Fake();
    fake.put('a', sensor('1'));
    const listener = vi.fn<(entity: Entity | undefined) => void>();
    const off = fake.subscribe('a', listener);
    off();
    off();
    fake.put('a', sensor('2'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('an unchanged input keeps the same entity object and does not notify', () => {
    const fake = new Fake();
    const input = sensor('1');
    fake.put('a', input);
    const first = fake.getEntity('a');
    const listener = vi.fn<(entity: Entity | undefined) => void>();
    fake.subscribe('a', listener);
    fake.replace({ a: input });
    fake.put('a', input);
    expect(fake.getEntity('a')).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('replaceEntities removes what is no longer there', () => {
    const fake = new Fake();
    fake.replace({ a: sensor('1'), b: sensor('2') });
    const listener = vi.fn<(entity: Entity | undefined) => void>();
    fake.subscribe('b', listener);
    fake.replace({ a: sensor('1') });
    expect(fake.getEntity('b')).toBeUndefined();
    expect(listener).toHaveBeenLastCalledWith(undefined);
  });

  test('leaving connected marks entities unavailable; reconnecting restores them', async () => {
    const fake = new Fake();
    const input = sensor('1');
    await fake.connect();
    fake.put('a', input);
    const listener = vi.fn<(entity: Entity | undefined) => void>();
    fake.subscribe('a', listener);
    fake.disconnect();
    expect(fake.getEntity('a')?.availability).toBe('unavailable');
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ availability: 'unavailable' }),
    );

    await fake.connect();
    fake.replace({ a: input });
    expect(fake.getEntity('a')?.availability).toBe('ready');
  });

  test('status listeners fire only on a real change', async () => {
    const fake = new Fake();
    const statuses: string[] = [];
    fake.onStatusChange((s) => statuses.push(s));
    await fake.connect();
    await fake.connect();
    fake.disconnect();
    expect(statuses).toEqual(['connected', 'disconnected']);
  });
});
