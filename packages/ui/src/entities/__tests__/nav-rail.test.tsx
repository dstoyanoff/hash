import { LocalClient, MockIntegration } from '@hashsome/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'e-prim';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import { HashsomeProvider } from '../../provider.tsx';
import { darkTheme } from '../../theme/index.ts';
import { NavRail } from '../nav-rail.tsx';

afterEach(cleanup);

test('nav rail resolves items against base and marks the current page', () => {
  render(
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter initialEntries={['/home/upstairs']}>
        <NavRail
          base="/home"
          items={[
            { to: '', label: 'Downstairs', icon: 'lu:house' },
            { to: 'upstairs', label: 'Upstairs', icon: 'tb:stairs-up' },
          ]}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(screen.getByRole('link', { name: 'Upstairs' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Downstairs' }).getAttribute('aria-current')).toBeNull();
  expect(screen.getByRole('link', { name: 'Downstairs' }).getAttribute('href')).toBe('/home');
});

test('showThemeToggle is off by default, and toggles the theme when on', () => {
  const { rerender } = render(
    <HashsomeProvider client={new LocalClient([new MockIntegration({})])}>
      <MemoryRouter>
        <NavRail base="/home" items={[{ to: '', label: 'Home', icon: 'lu:house' }]} />
      </MemoryRouter>
    </HashsomeProvider>,
  );

  expect(screen.queryByRole('button')).toBeNull();

  rerender(
    <HashsomeProvider client={new LocalClient([new MockIntegration({})])} theme="dark">
      <MemoryRouter>
        <NavRail
          base="/home"
          items={[{ to: '', label: 'Home', icon: 'lu:house' }]}
          showThemeToggle
        />
      </MemoryRouter>
    </HashsomeProvider>,
  );

  const toggle = screen.getByRole('button', { name: /switch to light theme/i });
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeTruthy();
});

const railOf = (compact?: boolean) => {
  render(
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter initialEntries={['/home']}>
        <NavRail
          base="/home"
          {...(compact === undefined ? {} : { compact })}
          items={[
            { to: '', label: 'Home', icon: 'lu:house' },
            { to: 'music', label: 'Music', icon: 'lu:music' },
          ]}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );

  const nav = screen.getByRole('navigation', { name: 'Pages' });
  const marker = screen.getByRole('link', { name: 'Home' }).firstElementChild as HTMLElement;
  return { width: getComputedStyle(nav).width, marker: getComputedStyle(marker).width };
};

test('a rail is 76px wide with 44px markers, and a compact one 48px with 36px', () => {
  expect(railOf()).toEqual({ width: '76px', marker: '44px' });
  cleanup();
  expect(railOf(true)).toEqual({ width: '48px', marker: '36px' });
});
