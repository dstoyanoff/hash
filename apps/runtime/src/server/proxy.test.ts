import { MockIntegration, type ServerMessage } from '@hash/core';
import { describe, expect, test } from 'vitest';
import { Proxy, type ProxySocket } from './proxy.ts';

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

async function setup() {
  const ha = new MockIntegration({ entities: { 'light.lamp': { state: 'off' } } });
  await ha.connect();
  const proxy = new Proxy([ha]);
  const socket = new FakeSocket();
  proxy.handleConnection(socket);
  return { ha, socket };
}

describe('Proxy', () => {
  test('reports integration status on connect', async () => {
    const { socket } = await setup();
    expect(socket.sent).toContainEqual({ type: 'status', integration: 'ha', status: 'connected' });
  });

  test('subscribe replays current state and streams changes', async () => {
    const { ha, socket } = await setup();
    socket.receive({ type: 'subscribe', ref: 'ha:light.lamp' });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'state', ref: 'ha:light.lamp' });
    ha.update('light.lamp', { state: 'on' });
    expect(socket.sent.at(-1)).toMatchObject({ type: 'state', state: { state: 'on' } });
  });

  test('unknown integration or entity yields null state', async () => {
    const { socket } = await setup();
    socket.receive({ type: 'subscribe', ref: 'zz:light.lamp' });
    expect(socket.sent.at(-1)).toEqual({ type: 'state', ref: 'zz:light.lamp', state: null });
    socket.receive({ type: 'subscribe', ref: 'ha:light.nope' });
    expect(socket.sent.at(-1)).toEqual({ type: 'state', ref: 'ha:light.nope', state: null });
  });

  test('call routes to the integration and acknowledges', async () => {
    const { ha, socket } = await setup();
    socket.receive({
      type: 'call',
      id: 7,
      integration: 'ha',
      domain: 'light',
      service: 'toggle',
      entityIds: ['light.lamp'],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ha.getState('light.lamp')?.state).toBe('on');
    expect(socket.sent.at(-1)).toEqual({ type: 'result', id: 7, ok: true });
  });

  test('call failures and unknown integrations return errors', async () => {
    const { ha, socket } = await setup();
    ha.callService = () => Promise.reject(new Error('boom'));
    socket.receive({ type: 'call', id: 1, integration: 'ha', domain: 'a', service: 'b' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(socket.sent.at(-1)).toEqual({ type: 'result', id: 1, ok: false, error: 'boom' });
    socket.receive({ type: 'call', id: 2, integration: 'nope', domain: 'a', service: 'b' });
    expect(socket.sent.at(-1)).toMatchObject({ id: 2, ok: false });
  });

  test('ignores malformed frames and cleans up on close', async () => {
    const { ha, socket } = await setup();
    socket.receive('garbage');
    socket.receive({ type: 'subscribe', ref: 'ha:light.lamp' });
    const count = socket.sent.length;
    socket.close();
    ha.update('light.lamp', { state: 'on' });
    expect(socket.sent).toHaveLength(count);
  });
});
