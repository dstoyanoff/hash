import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Reveal } from '../reveal.tsx';

afterEach(cleanup);

test('what is revealed starts hidden and a few pixels low, and is only that: it takes the room it always did', () => {
  const { container } = render(
    <Reveal>
      <span>card</span>
    </Reveal>,
  );

  const wrapper = container.firstElementChild as HTMLElement;
  expect(wrapper.contains(container.querySelector('span'))).toBe(true);
  expect(wrapper.style.opacity).toBe('0');
  expect(wrapper.style.transform).toContain('translateY(8px)');
});
