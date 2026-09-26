import { describe, expect, test } from 'vitest';
import {
  encodeMessage,
  parseClientMessage,
  parseServerMessage,
  type ClientMessage,
} from './protocol.ts';

describe('protocol', () => {
  test('round-trips valid client messages', () => {
    const call: ClientMessage = {
      type: 'call',
      id: 1,
      integration: 'ha',
      domain: 'light',
      service: 'turn_on',
      entityIds: ['light.a'],
      data: { brightness: 10 },
    };
    expect(parseClientMessage(encodeMessage(call))).toEqual(call);
    expect(parseClientMessage('{"type":"subscribe","ref":"ha:light.a"}')).toEqual({
      type: 'subscribe',
      ref: 'ha:light.a',
    });
  });

  test.each([
    'not json',
    '[]',
    '{"type":"subscribe","ref":"nocolon"}',
    '{"type":"call","id":"x","integration":"ha","domain":"a","service":"b"}',
    '{"type":"call","id":1,"integration":"ha","domain":"a","service":"b","entityIds":[1]}',
    '{"type":"unknown"}',
  ])('rejects malformed client frame %s', (raw) => {
    expect(parseClientMessage(raw)).toBeUndefined();
  });

  test('parses server messages', () => {
    expect(parseServerMessage('{"type":"state","ref":"ha:a.b","state":null}')).toBeDefined();
    expect(parseServerMessage('{"type":"result","id":1,"ok":false,"error":"x"}')).toBeDefined();
    expect(
      parseServerMessage('{"type":"status","integration":"ha","status":"connected"}'),
    ).toBeDefined();
    expect(parseServerMessage('{"type":"state","ref":"bad"}')).toBeUndefined();
  });
});
