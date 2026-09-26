import { RemoteClient, type EntityRef } from '@hash/core';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { HashProvider, useEntity } from './index.ts';

function Probe() {
  const state = useEntity('ha:light.lamp' as EntityRef);
  return <span>{state === undefined ? 'loading' : (state?.state ?? 'missing')}</span>;
}

test('useEntity renders loading state on the server', () => {
  const client = new RemoteClient({ url: 'ws://x/ws' });
  expect(
    renderToString(
      <HashProvider client={client}>
        <Probe />
      </HashProvider>,
    ),
  ).toContain('loading');
});

test('useEntity throws outside provider', () => {
  expect(() => renderToString(<Probe />)).toThrow(/HashProvider/);
});
