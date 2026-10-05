import {
  LocalClient,
  mockAction,
  mockPerson,
  mockSensor,
  mockWeather,
  MockIntegration,
} from '@hash/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
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

const twoDashboards = [
  { id: 'living-room', title: 'Living Room', icon: 'lu:sofa' },
  { id: 'bedroom', title: 'Bedroom', icon: 'lu:bed' },
] as const;

test('a title with 2+ dashboards opens a switcher and closes it on pick', () => {
  renderWithMock(
    <TopBar title="Living Room" dashboards={[...twoDashboards]} />,
    {},
    { router: true },
  );

  expect(screen.queryByRole('option', { name: 'Bedroom' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Living Room' }));
  expect(screen.getByRole('option', { name: 'Bedroom' })).toBeTruthy();
  fireEvent.click(screen.getByRole('option', { name: 'Bedroom' }));
  expect(screen.queryByRole('option', { name: 'Bedroom' })).toBeNull();
});

test('the dashboard being shown is marked, and cannot be picked again', () => {
  const { container } = renderWithMock(
    <TopBar title="Living Room" dashboards={[...twoDashboards]} />,
    {},
    { router: true },
  );

  fireEvent.click(screen.getByRole('button', { name: 'Living Room' }));
  const here = screen.getByRole('option', { name: 'Living Room' });
  expect(here.getAttribute('aria-selected')).toBe('true');
  expect((here as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('option', { name: 'Bedroom' }).getAttribute('aria-selected')).toBe(
    'false',
  );

  // Pressing it does nothing: the list stays as it is.
  fireEvent.click(here);
  expect(screen.getByRole('option', { name: 'Bedroom' })).toBeTruthy();
  expect(container).toBeTruthy();
});

test('the closed switcher shows the current dashboard’s icon next to its title', () => {
  const { container } = renderWithMock(
    <MemoryRouter initialEntries={['/bedroom']}>
      <TopBar title="Bedroom" dashboards={[...twoDashboards]} />
    </MemoryRouter>,
  );

  const pill = screen.getByRole('button', { name: 'Bedroom' });
  expect(pill.querySelectorAll('svg')).toHaveLength(2); // its icon and the chevron
  expect(container).toBeTruthy();
});

test('which one is current follows the address', () => {
  renderWithMock(
    <MemoryRouter initialEntries={['/bedroom/lights']}>
      <TopBar title="Whatever" dashboards={[...twoDashboards]} />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Whatever' }));
  expect(screen.getByRole('option', { name: 'Bedroom' }).getAttribute('aria-selected')).toBe(
    'true',
  );
});

test('a press elsewhere, or Escape, closes the switcher', () => {
  renderWithMock(
    <TopBar title="Living Room" dashboards={[...twoDashboards]} />,
    {},
    { router: true },
  );

  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Living Room' }));
  open();
  expect(screen.getByRole('listbox')).toBeTruthy();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).toBeNull();

  open();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();

  // A press inside it is not "elsewhere".
  open();
  fireEvent.pointerDown(screen.getByRole('option', { name: 'Bedroom' }));
  expect(screen.getByRole('listbox')).toBeTruthy();
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

test('your own component sits in the bar, between the weather and the people', () => {
  renderWithMock(
    <TopBar
      title="Home"
      weather="ha:outdoor_temperature"
      people={['ha:dan']}
      extra={<span data-testid="mine">Guard</span>}
    />,
    {
      outdoor_temperature: mockSensor({ value: '16', unit: '°C', measurement: 'temperature' }),
      dan: mockPerson({ name: 'Dan', home: true }),
    },
  );

  const mine = screen.getByTestId('mine');
  const weather = screen.getByText('16°');
  const dan = screen.getByRole('img', { name: /Dan/ });
  expect(weather.compareDocumentPosition(mine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(mine.compareDocumentPosition(dan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

describe('weather', () => {
  const pill = (entity: ReturnType<typeof mockWeather>) => {
    renderWithMock(<TopBar title="Home" weather="ha:sky" />, { sky: entity });
    return screen.getByText(/°$/).parentElement as HTMLElement;
  };

  test('a weather entity shows a rounded temperature and an icon for its condition', () => {
    const sunny = pill(mockWeather({ condition: 'sunny', temperature: 15.6 }));
    expect(sunny.textContent).toBe('16°');
    const sunIcon = sunny.querySelector('svg')?.innerHTML;
    cleanup();

    const rainy = pill(mockWeather({ condition: 'rainy', temperature: 9.2 }));
    expect(rainy.textContent).toBe('9°');
    expect(rainy.querySelector('svg')?.innerHTML).not.toBe(sunIcon);
  });

  test('a condition nobody knows still gets an icon, and no reading says what is wrong', () => {
    expect(
      pill(mockWeather({ condition: 'unknown', temperature: 3 })).querySelector('svg'),
    ).toBeTruthy();

    cleanup();

    renderWithMock(<TopBar title="Home" weather="ha:sky" />, {
      sky: mockWeather({ availability: 'unavailable' }),
    });

    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  test('a plain sensor still works, with a fixed sun', () => {
    renderWithMock(<TopBar title="Home" weather="ha:out" />, {
      out: mockSensor({ value: '12.3', unit: '°C' }),
    });

    expect(screen.getByText('12°')).toBeTruthy();
  });
});
