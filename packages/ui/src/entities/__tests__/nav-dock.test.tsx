import { LocalClient, MockIntegration } from '@hash/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'e-prim';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { HashProvider } from '../../provider.tsx';
import { darkTheme } from '../../theme/index.ts';
import { NavDock } from '../nav-dock.tsx';

test('nav dock resolves items against base and marks the current page', () => {
  render(
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter initialEntries={['/dashboard/home']}>
        <NavDock
          base="/dashboard/home"
          items={[
            { to: '', label: 'Downstairs', icon: 'lu:house' },
            { to: 'upstairs', label: 'Upstairs', icon: 'tb:stairs-up' },
          ]}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(screen.getByRole('link', { name: 'Downstairs' }).getAttribute('aria-current')).toBe(
    'page',
  );

  expect(screen.getByRole('link', { name: 'Upstairs' }).getAttribute('aria-current')).toBeNull();
  expect(screen.getByRole('link', { name: 'Upstairs' }).getAttribute('href')).toBe(
    '/dashboard/home/upstairs',
  );
});

test('showThemeToggle is off by default, and toggles the theme when on', () => {
  const { rerender } = render(
    <HashProvider client={new LocalClient([new MockIntegration({})])}>
      <MemoryRouter>
        <NavDock base="/dashboard/home" items={[{ to: '', label: 'Home', icon: 'lu:house' }]} />
      </MemoryRouter>
    </HashProvider>,
  );

  expect(screen.queryByRole('button')).toBeNull();

  rerender(
    <HashProvider client={new LocalClient([new MockIntegration({})])} theme="dark">
      <MemoryRouter>
        <NavDock
          base="/dashboard/home"
          items={[{ to: '', label: 'Home', icon: 'lu:house' }]}
          showThemeToggle
        />
      </MemoryRouter>
    </HashProvider>,
  );

  const toggle = screen.getByRole('button', { name: /switch to light theme/i });
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeTruthy();
});
