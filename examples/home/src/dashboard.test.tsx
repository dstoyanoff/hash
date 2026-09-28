import { LocalClient, MockIntegration } from '@hash/core';
import { HashProvider } from '@hash/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useRoutes, type RouteObject } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import routes from './routes.tsx';

afterEach(cleanup);

// The runtime mounts a dashboard's `routes` behind its own splat route (`dashboard/{id}/*`) and
// calls `useRoutes(routes)` inside it; nested `useRoutes` then matches relative to that splat.
// Reproduce that shape so the layout's absolute `/dashboard/home/...` links resolve exactly as
// they do in the real app, instead of mounting `routes` as if it owned the whole router.
function DashboardEntry() {
  return useRoutes(routes);
}
const wrapperRoutes: RouteObject[] = [{ path: 'dashboard/home/*', element: <DashboardEntry /> }];

function renderDashboard(initialPath: string) {
  const ha = new MockIntegration({
    entities: {
      'media_player.living_room': { state: 'playing', attributes: { media_title: 'Blank Space' } },
      'light.living_room_lamp': { state: 'off', attributes: { supported_color_modes: ['onoff'] } },
      'light.living_room_wall': {
        state: 'off',
        attributes: { supported_color_modes: ['brightness'] },
      },
      'light.living_room_accent': { state: 'off', attributes: { supported_color_modes: ['hs'] } },
      'climate.living_room': {
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 17 },
      },
      'light.kitchen_ceiling': { state: 'off', attributes: { supported_color_modes: ['onoff'] } },
      'light.kitchen_led': { state: 'off', attributes: { supported_color_modes: ['brightness'] } },
      'light.porch_lamp': { state: 'unavailable' },
      'light.porch_ambient': { state: 'off', attributes: { supported_color_modes: ['hs'] } },
      'light.master_bedroom_lamp': { state: 'off', attributes: { supported_color_modes: ['hs'] } },
      'climate.master_bedroom': {
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 19.5 },
      },
      'light.bathroom_led': {
        state: 'on',
        attributes: { supported_color_modes: ['brightness'], brightness: 153 },
      },
      'climate.office': {
        state: 'off',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 21.5 },
      },
    },
  });
  const client = new LocalClient([ha]);
  const router = createMemoryRouter(wrapperRoutes, { initialEntries: [initialPath] });
  return {
    ha,
    ...render(
      <HashProvider client={client}>
        <RouterProvider router={router} />
      </HashProvider>,
    ),
  };
}

test('downstairs page renders every room and reacts to a real toggle', () => {
  const { ha } = renderDashboard('/dashboard/home');
  for (const name of ['living room', 'kitchen', 'porch', 'Blank Space']) {
    expect(screen.getByText(name)).toBeTruthy();
  }
  const lamp = screen.getByRole('button', { name: 'lamp' });
  expect(lamp.textContent).toContain('Off');
  fireEvent.click(lamp);
  expect(ha.getState('light.living_room_lamp')?.state).toBe('on');
});

test('unavailable and disabled entities are shown, not hidden', () => {
  renderDashboard('/dashboard/home');
  expect(screen.getByText('Unavailable')).toBeTruthy();
});

test('upstairs page renders and the tab bar marks the current page', () => {
  renderDashboard('/dashboard/home/upstairs');
  for (const name of ['master bedroom', 'bathroom', 'office']) {
    expect(screen.getByText(name)).toBeTruthy();
  }
  expect(screen.getByRole('link', { name: 'Upstairs' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Downstairs' }).getAttribute('aria-current')).toBeNull();
});
