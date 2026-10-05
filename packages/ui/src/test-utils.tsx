import { LocalClient, MockIntegration, type EntityInput, type MockLibrary } from '@hashsome/core';
import { cleanup, render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach } from 'vitest';
import { HashsomeProvider } from './provider.tsx';

afterEach(cleanup);

/** Renders `ui` against a mock backend and returns the backend for assertions. */
export function renderWithMock(
  ui: ReactElement,
  entities: Record<string, EntityInput> = {},
  options: { router?: boolean; library?: MockLibrary } = {},
): RenderResult & { ha: MockIntegration; client: LocalClient } {
  const ha = new MockIntegration({
    entities,
    ...(options.library ? { library: options.library } : {}),
  });

  const client = new LocalClient([ha]);
  const tree = (
    <HashsomeProvider client={client}>
      {options.router ? <MemoryRouter>{ui}</MemoryRouter> : ui}
    </HashsomeProvider>
  );

  return { ha, client, ...render(tree) };
}
