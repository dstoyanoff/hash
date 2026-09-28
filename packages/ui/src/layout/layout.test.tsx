import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { mdiSofa } from '../icons.ts';
import { NavTabs } from '../entities/nav-tabs.tsx';
import { Dashboard } from './dashboard.tsx';
import { Grid } from './grid.tsx';
import { Screen } from './screen.tsx';
import { Section } from './section.tsx';

test('dashboard sets density', () => {
  const { container } = render(<Dashboard density="compact">x</Dashboard>);
  expect(container.querySelector('.hash-dashboard')?.getAttribute('data-density')).toBe('compact');
});

test('screen caps size to the viewport and does not scroll by default', () => {
  const { container } = render(<Screen viewport={{ width: 480, height: 480 }}>x</Screen>);
  const el = container.querySelector<HTMLElement>('.hash-screen');
  expect(el?.style.maxWidth).toBe('480px');
  expect(el?.style.maxHeight).toBe('480px');
  expect(el?.getAttribute('data-scroll')).toBe('false');
});

test('grid sets column count', () => {
  const { container } = render(<Grid columns={3}>x</Grid>);
  expect(
    container
      .querySelector<HTMLElement>('.hash-grid')
      ?.style.getPropertyValue('--hash-grid-columns'),
  ).toBe('3');
});

test('section renders title, readouts and children', () => {
  render(
    <Section title="kitchen" icon={mdiSofa} readouts={<span>18 °C</span>}>
      <span>child</span>
    </Section>,
  );
  expect(screen.getByRole('heading', { name: 'kitchen' })).toBeTruthy();
  expect(screen.getByText('18 °C')).toBeTruthy();
  expect(screen.getByText('child')).toBeTruthy();
});

test('nav tabs mark the current page', () => {
  render(
    <MemoryRouter initialEntries={['/bedroom']}>
      <NavTabs
        items={[
          { to: '/', label: 'Home', icon: mdiSofa },
          { to: '/bedroom', label: 'Bedroom', icon: mdiSofa },
        ]}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Bedroom' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
});
