import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Reveal } from '../reveal.tsx';

// The setting is read once, when motion first asks, so it is in place before anything is imported.
vi.hoisted(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(cleanup);

test('where less motion is asked for, it just appears, with nothing around it', () => {
  const { container } = render(
    <Reveal>
      <span>card</span>
    </Reveal>,
  );

  expect((container.firstElementChild as HTMLElement).tagName).toBe('SPAN');
});
