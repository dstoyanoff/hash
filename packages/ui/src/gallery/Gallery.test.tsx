import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { Gallery } from './Gallery.tsx';

test('gallery renders every component', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Gallery />
    </MemoryRouter>,
  );
  for (const name of [
    'lamp',
    'bathroom led',
    'night lamp',
    'living room heater',
    'tv time',
    'shower',
    'Blank Space',
  ]) {
    expect(screen.getAllByText(name).length).toBeGreaterThan(0);
  }
  // Uniform non-ready states across component types.
  expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(3);
  expect(screen.getAllByText('Not found').length).toBeGreaterThan(0);
  expect(container.querySelector('.hash-tabs')).not.toBeNull();
});
