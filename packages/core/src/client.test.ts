import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { RemoteClient } from './client.ts';
import type { EntityRef, EntityState } from './entity.ts';

class FakeSocket extends EventTarget {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];
  constructor(public url: string) {
    super();
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
  receive(message: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }
}

const lamp = 'ha:light.lamp' as EntityRef;
const state = { ref: lamp, state: 'on', attributes: {} } as EntityState;

function make() {
  FakeSocket.instances = [];
  const client = new RemoteClient({
    url: 'ws://x/ws',
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    reconnectMinMs: 100,
  });
  client.connect();
  return { client, socket: () => FakeSocket.instances.at(-1)! };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('subscribes once per ref and delivers state', () => {
  const { client, socket } = make();
  socket().open();
  const a = vi.fn<(s: EntityState | null | undefined) => void>();
  const b = vi.fn<(s: EntityState | null | undefined) => void>();
  client.subscribe(lamp, a);
  client.subscribe(lamp, b);
  expect(socket().sent).toEqual([{ type: 'subscribe', ref: lamp }]);
  socket().receive({ type: 'state', ref: lamp, state });
  expect(a).toHaveBeenLastCalledWith(state);
  expect(b).toHaveBeenLastCalledWith(state);
});

test('unsubscribes when last listener leaves', () => {
  const { client, socket } = make();
  socket().open();
  const off = client.subscribe(lamp, () => {});
  off();
  expect(socket().sent.at(-1)).toEqual({ type: 'unsubscribe', ref: lamp });
});

test('reconnects with backoff and resubscribes', () => {
  const { client, socket } = make();
  socket().open();
  client.subscribe(lamp, () => {});
  socket().close();
  expect(client.link).toBe('closed');
  vi.advanceTimersByTime(100);
  expect(FakeSocket.instances).toHaveLength(2);
  socket().open();
  expect(socket().sent).toEqual([{ type: 'subscribe', ref: lamp }]);
});

test('service calls resolve and reject from results', async () => {
  const { client, socket } = make();
  socket().open();
  const ok = client.callService('ha', { domain: 'light', service: 'toggle' });
  socket().receive({ type: 'result', id: 1, ok: true });
  await expect(ok).resolves.toBeUndefined();
  const bad = client.callService('ha', { domain: 'light', service: 'toggle' });
  socket().receive({ type: 'result', id: 2, ok: false, error: 'nope' });
  await expect(bad).rejects.toThrow('nope');
});

test('tracks integration status and does not reconnect after close()', () => {
  const { client, socket } = make();
  socket().open();
  socket().receive({ type: 'status', integration: 'ha', status: 'connected' });
  expect(client.getIntegrationStatus('ha')).toBe('connected');
  client.close();
  vi.advanceTimersByTime(60_000);
  expect(FakeSocket.instances).toHaveLength(1);
});
