import { describe, expect, test, vi } from 'vitest';
import type { EntityState } from './entity.ts';
import { MockIntegration } from './mock.ts';

const make = () =>
  new MockIntegration({
    entities: {
      'light.lamp': { state: 'off' },
      'climate.heater': { state: 'heat', attributes: { temperature: 17 } },
    },
  });

describe('MockIntegration', () => {
  test('subscribe emits current state, then changes', () => {
    const ha = make();
    const listener = vi.fn<(state: EntityState | undefined) => void>();
    ha.subscribe('light.lamp', listener);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'off' }));
    ha.update('light.lamp', { state: 'on' });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ ref: 'ha:light.lamp', state: 'on' }),
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('unsubscribe stops notifications', () => {
    const ha = make();
    const listener = vi.fn<(state: EntityState | undefined) => void>();
    const off = ha.subscribe('light.lamp', listener);
    off();
    ha.update('light.lamp', { state: 'on' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('unknown entity yields undefined', () => {
    const listener = vi.fn<(state: EntityState | undefined) => void>();
    make().subscribe('light.nope', listener);
    expect(listener).toHaveBeenCalledWith(undefined);
  });

  test('services update state and are recorded', async () => {
    const ha = make();
    await ha.callService({
      domain: 'light',
      service: 'turn_on',
      entityIds: ['light.lamp'],
      data: { brightness: 100 },
    });
    expect(ha.getState('light.lamp')).toMatchObject({
      state: 'on',
      attributes: { brightness: 100 },
    });
    await ha.callService({
      domain: 'climate',
      service: 'set_temperature',
      entityIds: ['climate.heater'],
      data: { temperature: 21 },
    });
    expect(ha.getState('climate.heater')?.attributes.temperature).toBe(21);
    expect(ha.calls).toHaveLength(2);
  });

  test('status changes are reported', async () => {
    const ha = make();
    const statuses: string[] = [];
    ha.onStatusChange((s) => statuses.push(s));
    await ha.connect();
    ha.disconnect();
    expect(statuses).toEqual(['connected', 'disconnected']);
  });
});
