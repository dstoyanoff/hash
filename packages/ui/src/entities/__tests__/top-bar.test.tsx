import { LocalClient, mockAction, mockPerson, mockSensor, MockIntegration } from '@hash/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { HashProvider } from '../../provider.tsx';
import { renderWithMock } from '../../test-utils.tsx';
import { TopBar } from '../top-bar.tsx';

const entities = {
  movie_night: mockAction({ name: 'Movie Night' }),
  outdoor_temperature: mockSensor({ value: '12.3', unit: '°C', measurement: 'temperature' }),
  dan: mockPerson({ name: 'Dan' }),
};

test('renders title, fires a scene, and shows weather and presence', () => {
  const { ha } = renderWithMock(
    <TopBar
      title="Downstairs"
      scenes={['ha:movie_night']}
      weather="ha:outdoor_temperature"
      people={['ha:dan']}
    />,
    entities,
  );

  expect(screen.getByRole('heading', { name: 'Downstairs', level: 1 })).toBeTruthy();
  expect(screen.getByText('12°')).toBeTruthy();
  expect(screen.getByText('D')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Movie Night' }));
  expect(ha.calls).toHaveLength(1);
  expect(ha.calls[0]).toMatchObject({ entityId: 'movie_night', command: 'trigger' });
});

test('a scene can override its default icon', () => {
  const { ha } = renderWithMock(
    <TopBar title="Downstairs" scenes={[{ entity: 'ha:movie_night', icon: 'lu:tv' }]} />,
    entities,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Movie Night' }));
  expect(ha.calls).toHaveLength(1);
});

test('a title with 2+ dashboards opens a switcher and closes it on pick', () => {
  renderWithMock(
    <TopBar
      title="Living Room"
      dashboards={[
        { id: 'living-room', title: 'Living Room', icon: 'lu:sofa' },
        { id: 'bedroom', title: 'Bedroom', icon: 'lu:bed' },
      ]}
    />,
    {},
    { router: true },
  );

  expect(screen.queryByRole('button', { name: 'Bedroom' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Living Room' }));
  expect(screen.getByRole('button', { name: 'Bedroom' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bedroom' }));
  expect(screen.queryByRole('button', { name: 'Bedroom' })).toBeNull();
});

test('a title with 0-1 dashboards is plain, non-interactive text', () => {
  renderWithMock(<TopBar title="Living Room" />, {}, { router: true });
  expect(screen.getByRole('heading', { name: 'Living Room', level: 1 })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Living Room' })).toBeNull();
});

test('weather falls back to the status label when the sensor is unavailable', () => {
  renderWithMock(<TopBar title="Downstairs" weather="ha:outdoor_temperature" />, {
    outdoor_temperature: mockSensor({ value: '1', availability: 'unavailable' }),
  });

  expect(screen.getByText('Unavailable')).toBeTruthy();
});

test('a scene without an explicit color still renders (auto-assigned)', () => {
  const { ha } = renderWithMock(
    <TopBar title="Downstairs" scenes={[{ entity: 'ha:movie_night', color: '#123456' }]} />,
    entities,
  );

  const button = screen.getByRole('button', { name: 'Movie Night' });
  expect(getComputedStyle(button).backgroundColor).toBe('rgb(18, 52, 86)'); // #123456
  fireEvent.click(button);
  expect(ha.calls).toHaveLength(1);
});

test('the status dot reports all systems operational and opens per-system detail', () => {
  const { client } = renderWithMock(<TopBar title="Downstairs" />, entities);
  client.connect();
  const dot = screen.getByRole('button', { name: 'All systems operational' });
  fireEvent.click(dot);
  expect(screen.getByRole('status').textContent).toContain('Runtime');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('status')).toBeNull();
});

test('the status dot flags an integration that drops', () => {
  class Flaky extends MockIntegration {
    drop() {
      this.setStatus('error');
    }
  }
  const flaky = new Flaky({ id: 'ha', entities: {} });
  const client = new LocalClient([flaky]);
  render(
    <HashProvider client={client}>
      <TopBar title="Downstairs" />
    </HashProvider>,
  );

  expect(screen.getByRole('button', { name: 'All systems operational' })).toBeTruthy();
  act(() => flaky.drop());
  fireEvent.click(screen.getByRole('button', { name: '1 system(s) down' }));
  expect(screen.getByRole('status').textContent).toContain('Error');
});

test('a scene dot uses the color its app gave it, and the theme accent otherwise', () => {
  renderWithMock(
    <TopBar
      title="Downstairs"
      scenes={[{ entity: 'ha:movie_night', color: '#123456' }, 'ha:cooking']}
    />,
    { ...entities, cooking: mockAction({ name: 'Cooking' }) },
  );

  expect(
    getComputedStyle(screen.getByRole('button', { name: 'Movie Night' })).backgroundColor,
  ).toBe('rgb(18, 52, 86)');

  expect(getComputedStyle(screen.getByRole('button', { name: 'Cooking' })).backgroundColor).toBe(
    'rgb(255, 122, 69)', // the dark theme's accent
  );
});

test('presence avatars without a picture take their color from the `presenceColors` list', () => {
  renderWithMock(
    <TopBar title="Downstairs" people={['ha:dan']} presenceColors={['#123456']} />,
    entities,
  );

  expect(getComputedStyle(screen.getByText('D').parentElement as HTMLElement).backgroundColor).toBe(
    'rgb(18, 52, 86)',
  );
});

test('presence shows who is home normally, and dims anyone who is away', () => {
  renderWithMock(<TopBar title="Downstairs" people={['ha:dan', 'ha:alex']} />, {
    ...entities,
    alex: mockPerson({ name: 'Alex', location: 'away' }),
  });

  const dan = screen.getByRole('img', { name: 'Dan, home' });
  const alex = screen.getByRole('img', { name: 'Alex, away' });
  expect(dan.getAttribute('data-active')).toBe('true');
  expect(alex.getAttribute('data-active')).toBe('false');
  // Faded by an overlay on top of its own color, never by opacity (a see-through avatar would show
  // the one it overlaps) and never recolored.
  expect(getComputedStyle(alex).opacity).not.toBe('0.4');
  expect(getComputedStyle(alex).filter).not.toBe('grayscale(1)');
});
