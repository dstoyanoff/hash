import { LocalClient, MockIntegration, type MockEntity } from '@hash/core';
import { cleanup, render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach } from 'vitest';
import { HashProvider } from './provider.tsx';

afterEach(cleanup);

/** Renders `ui` against a mock backend and returns the backend for assertions. */
export function renderWithMock(
  ui: ReactElement,
  entities: Record<string, MockEntity> = {},
  options: { router?: boolean } = {},
): RenderResult & { ha: MockIntegration; client: LocalClient } {
  const ha = new MockIntegration({ entities });
  const client = new LocalClient([ha]);
  const tree = (
    <HashProvider client={client}>
      {options.router ? <MemoryRouter>{ui}</MemoryRouter> : ui}
    </HashProvider>
  );
  return { ha, client, ...render(tree) };
}
