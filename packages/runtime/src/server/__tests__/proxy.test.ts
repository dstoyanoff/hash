import {
  mockLibrary,
  mockLight,
  mockMediaPlayer,
  mockSensor,
  MockIntegration,
  type ServerMessage,
} from '@hashsome/core';
import { describe, expect, test } from 'vitest';
import { Proxy, type ProxySocket } from '../proxy.ts';

class FakeSocket implements ProxySocket {
  readyState = 1;
  sent: ServerMessage[] = [];
  #handlers: Record<string, (data: { toString(): string }) => void> = {};
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  on(event: 'message', listener: (data: { toString(): string }) => void): void;
  on(event: 'close' | 'error', listener: () => void): void;
  on(event: string, handler: (data: { toString(): string }) => void): void {
    this.#handlers[event] = handler;
  }
  receive(message: unknown) {
    this.#handlers.message?.({ toString: () => JSON.stringify(message) });
  }
  close() {
    this.readyState = 3;
    this.#handlers.close?.({ toString: () => '' });
  }
}

async function setup(connected = true) {
  const ha = new MockIntegration({ entities: { lamp: mockLight({ on: false }) } });
  if (connected) {
    await ha.connect();
  }

  const logs: string[] = [];
  const proxy = new Proxy([ha], { log: (m) => logs.push(m) });
  const socket = new FakeSocket();
  proxy.handleConnection(socket);
  return { ha, socket, logs };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Proxy', () => {
  test('reports integration status on connect', async () => {
    const { socket } = await setup();
    expect(socket.sent).toContainEqual({ type: 'status', integration: 'ha', status: 'connected' });
  });

  test('subscribe replays the current entity and streams changes, with the local id', async () => {
    const { ha, socket } = await setup();
    socket.receive({ type: 'subscribe', ref: 'ha:lamp' });
    expect(socket.sent.at(-1)).toMatchObject({
      type: 'entity',
      ref: 'ha:lamp',
      entity: { on: false },
    });

    ha.update('lamp', { on: true });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'entity', entity: { on: true } });
  });

  test('a subscription waits for the integration to connect, then resolves', async () => {
    const { ha, socket } = await setup(false);
    socket.receive({ type: 'subscribe', ref: 'ha:lamp' });
    expect(socket.sent.some((m) => m.type === 'entity')).toBe(false);
    await ha.connect();
    expect(socket.sent.at(-1)).toMatchObject({ type: 'entity', ref: 'ha:lamp' });
  });

  test('an unknown integration or entity yields null and is logged', async () => {
    const { socket, logs } = await setup();
    socket.receive({ type: 'subscribe', ref: 'zz:lamp' });
    expect(socket.sent.at(-1)).toEqual({ type: 'entity', ref: 'zz:lamp', entity: null });
    socket.receive({ type: 'subscribe', ref: 'ha:nope' });
    expect(socket.sent.at(-1)).toEqual({ type: 'entity', ref: 'ha:nope', entity: null });
    expect(logs).toHaveLength(2);
  });

  test('commands route to the integration by local id and acknowledge', async () => {
    const { ha, socket } = await setup();
    socket.receive({ type: 'command', id: 7, ref: 'ha:lamp', command: 'toggle' });
    await settle();
    expect(ha.getEntity('lamp')).toMatchObject({ on: true });
    expect(ha.calls).toEqual([{ entityId: 'lamp', command: 'toggle' }]);
    expect(socket.sent.at(-1)).toEqual({ type: 'result', id: 7, ok: true });
  });

  test('command failures and unknown integrations return errors', async () => {
    const { ha, socket } = await setup();
    ha.command = () => Promise.reject(new Error('boom'));
    socket.receive({ type: 'command', id: 1, ref: 'ha:lamp', command: 'toggle' });
    await settle();
    expect(socket.sent.at(-1)).toEqual({ type: 'result', id: 1, ok: false, error: 'boom' });
    socket.receive({ type: 'command', id: 2, ref: 'nope:lamp', command: 'toggle' });
    await settle();
    expect(socket.sent.at(-1)).toMatchObject({ id: 2, ok: false });
  });

  test('raw requests need an integration that supports them', async () => {
    const { socket } = await setup();
    socket.receive({ type: 'raw', id: 3, integration: 'ha', request: {} });
    await settle();
    expect(socket.sent.at(-1)).toMatchObject({ id: 3, ok: false });
  });

  test('ignores malformed frames and cleans up on close', async () => {
    const { ha, socket } = await setup();
    socket.receive('garbage');
    socket.receive({ type: 'subscribe', ref: 'ha:lamp' });
    const count = socket.sent.length;
    socket.close();
    ha.update('lamp', { on: true });
    expect(socket.sent).toHaveLength(count);
  });
});

describe('browse queries', () => {
  async function library() {
    const ha = new MockIntegration({
      entities: { room: mockMediaPlayer({ capabilities: { browse: true } }) },
      library: mockLibrary(),
    });

    await ha.connect();
    const proxy = new Proxy([ha]);
    const socket = new FakeSocket();
    proxy.handleConnection(socket);
    return { socket };
  }

  test('a browse query is answered with the library level', async () => {
    const { socket } = await library();
    socket.receive({
      type: 'query',
      id: 1,
      ref: 'ha:room',
      query: 'browse',
      args: { path: 'playlists', evil: 'dropped' },
    });

    await settle();
    expect(socket.sent.at(-1)).toMatchObject({
      type: 'result',
      id: 1,
      ok: true,
      data: { title: 'Playlists' },
    });
  });

  test('only string path and search reach the integration', async () => {
    const { socket } = await library();
    socket.receive({ type: 'query', id: 2, ref: 'ha:room', query: 'browse', args: { path: 5 } });
    await settle();
    expect(socket.sent.at(-1)).toMatchObject({
      id: 2,
      ok: true,
      data: { items: expect.any(Array) },
    });
  });

  test('an unknown integration, and one with no library, are errors', async () => {
    const { socket } = await setup();
    socket.receive({ type: 'query', id: 3, ref: 'zz:room', query: 'browse' });
    await settle();
    expect(socket.sent.at(-1)).toMatchObject({ id: 3, ok: false });
    socket.receive({ type: 'query', id: 4, ref: 'ha:lamp', query: 'browse' });
    await settle();
    expect(socket.sent.at(-1)).toMatchObject({ id: 4, ok: false });
  });
});

describe('history queries', () => {
  async function withHistory() {
    class WithHistory extends MockIntegration {
      readonly asked: unknown[] = [];

      history(entityId: string, query: unknown) {
        this.asked.push([entityId, query]);
        return Promise.resolve({ kind: 'measurement' as const, points: [] });
      }
    }

    const ha = new WithHistory({ entities: { power: mockSensor({ value: '1' }) } });
    await ha.connect();
    const socket = new FakeSocket();
    new Proxy([ha]).handleConnection(socket);
    return { ha, socket };
  }

  test('a known range and bucket reach the integration, and nothing else does', async () => {
    const { ha, socket } = await withHistory();
    socket.receive({
      type: 'query',
      id: 1,
      ref: 'ha:power',
      query: 'history',
      args: { range: '1w', bucket: '1h', evil: 'dropped' },
    });

    await settle();
    expect(ha.asked).toEqual([['power', { range: '1w', bucket: '1h' }]]);
    expect(socket.sent.at(-1)).toMatchObject({ id: 1, ok: true, data: { points: [] } });
  });

  test('a missing or unknown range, or an integration that keeps no history, is an error', async () => {
    const { ha, socket } = await withHistory();
    socket.receive({
      type: 'query',
      id: 2,
      ref: 'ha:power',
      query: 'history',
      args: { range: '5y' },
    });

    socket.receive({ type: 'query', id: 3, ref: 'ha:power', query: 'history' });
    await settle();
    expect(ha.asked).toEqual([]);
    expect(socket.sent.slice(-2)).toMatchObject([
      { id: 2, ok: false },
      { id: 3, ok: false },
    ]);

    const { socket: plain } = await setup();
    plain.receive({
      type: 'query',
      id: 4,
      ref: 'ha:lamp',
      query: 'history',
      args: { range: '1d' },
    });

    await settle();
    expect(plain.sent.at(-1)).toMatchObject({ id: 4, ok: false });
  });
});
