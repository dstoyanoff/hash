import { fireEvent, screen } from '@testing-library/react';
import { motion } from 'motion/react';
import { expect, test, vi } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { RoundButton } from '../round-button.tsx';

const render = (ui: React.ReactElement) => renderWithMock(ui);

test('a round button is a button that is round, at the density’s usual size', () => {
  render(<RoundButton aria-label="Go">+</RoundButton>);
  const button = screen.getByRole('button', { name: 'Go' });
  const style = getComputedStyle(button);
  expect(button.getAttribute('type')).toBe('button');
  expect(button.getAttribute('style')).toBeNull();
  expect(style.width).toBe('44px');
  expect(style.height).toBe('44px');
  expect(style.borderRadius).toBe('999px');
  expect(style.cursor).toBe('pointer');
});

test('a size sets both sides from props, and the usual size is not forced over it', () => {
  render(<RoundButton aria-label="Small" size={28} />);
  const style = getComputedStyle(screen.getByRole('button', { name: 'Small' }));
  expect(style.width).toBe('28px');
  expect(style.height).toBe('28px');
});

test('its own css is added to the shared look instead of replacing it', () => {
  render(<RoundButton aria-label="Mine" css={{ flex: 'none' }} />);
  const style = getComputedStyle(screen.getByRole('button', { name: 'Mine' }));
  expect(style.flexShrink).toBe('0');
  expect(style.borderRadius).toBe('999px');
  expect(style.width).toBe('44px');
});

test('it takes the button’s own props, and a different element through `as`', () => {
  const onClick = vi.fn<() => void>();
  render(
    <RoundButton as={motion.button} aria-label="Animated" disabled onClick={onClick}>
      x
    </RoundButton>,
  );

  const button = screen.getByRole('button', { name: 'Animated' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
  expect(getComputedStyle(button).opacity).toBe('0.5');
});

test('state comes from data attributes: primary is the accent, active is warm', () => {
  render(
    <>
      <RoundButton aria-label="Primary" data-primary />
      <RoundButton aria-label="Active" data-active />
    </>,
  );

  expect(getComputedStyle(screen.getByRole('button', { name: 'Primary' })).backgroundColor).toBe(
    'rgb(255, 122, 69)',
  );

  expect(getComputedStyle(screen.getByRole('button', { name: 'Active' })).color).toBe(
    'rgb(227, 179, 65)',
  );
});
