import { render } from '@testing-library/react';
import { ThemeProvider } from 'e-prim';
import { expect, test } from 'vitest';
import { darkTheme } from '../../theme/index.ts';
import { HoldProgress } from '../hold-progress.tsx';
import { HOLD_MS } from '../use-hold.ts';

test('the hold line fills by a transform animation over the hold time, not by changing its width', () => {
  const { container } = render(
    <ThemeProvider theme={darkTheme}>
      <HoldProgress />
    </ThemeProvider>,
  );

  const line = container.querySelector('span') as HTMLElement;
  const style = getComputedStyle(line);
  // A full-width line that is scaled from its left end, by a CSS animation the browser runs itself.
  expect(style.width).toBe('100%');
  expect(style.transformOrigin).toContain('left');
  expect(style.animation).toContain(`${HOLD_MS}ms`);
  expect(style.animation).toContain('linear');
  // Nothing in JavaScript drives it: no inline width or transform.
  expect(line.style.width).toBe('');
  expect(line.style.transform).toBe('');
});
