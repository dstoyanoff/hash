import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { useTimed } from '../use-timed.ts';

function C() {
  const { active, start } = useTimed(300);
  return (
    <button type="button" onClick={() => start()}>
      {active ? 'playing' : 'idle'}
    </button>
  );
}

test('plays for its time and is over, also under React strict mode, which mounts and cleans up twice', async () => {
  render(
    <StrictMode>
      <C />
    </StrictMode>,
  );

  const button = screen.getByRole('button');
  act(() => button.click());
  expect(button.textContent).toBe('playing');
  // Starting it again does not stretch it.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 200)));
  act(() => button.click());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 200)));
  expect(button.textContent).toBe('idle');
});
