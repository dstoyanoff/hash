import { RemoteClient, type EntityRef } from '@hash/core';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { HashProvider, useConnectionStatus, useEntity } from './index.ts';

function Probe() {
  const state = useEntity('ha:light.lamp' as EntityRef);
  const link = useConnectionStatus();
  return (
    <span>
      {state === undefined ? 'loading' : (state?.state ?? 'missing')}/{link}
    </span>
  );
}

test('hooks render loading/closed on the server', () => {
  const client = new RemoteClient({ url: 'ws://x/ws' });
  expect(
    renderToString(
      <HashProvider client={client}>
        <Probe />
      </HashProvider>,
    ),
  ).toMatch(/loading.*\/.*closed/);
});

test('hooks throw outside a provider', () => {
  expect(() => renderToString(<Probe />)).toThrow(/HashProvider/);
});
