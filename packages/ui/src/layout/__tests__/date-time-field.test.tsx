import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocalClient } from '@hash/core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { HashProvider } from '../../provider.tsx';
import { DateTimeField } from '../date-time-field.tsx';

afterEach(cleanup);

const client = new LocalClient([]);

function Harness({ initial, min, max }: { initial: string; min?: string; max?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <HashProvider client={client}>
      <DateTimeField
        label="When"
        value={value}
        {...(min ? { min } : {})}
        {...(max ? { max } : {})}
        onChange={setValue}
      />
      <output data-testid="value">{value}</output>
    </HashProvider>
  );
}

const value = () => screen.getByTestId('value').textContent;
const open = () => fireEvent.click(screen.getByRole('button', { name: 'When' }));

test('the calendar opens inline, instantly, and closes again', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  expect(screen.queryByRole('group', { name: 'When picker' })).toBeNull();
  open();
  expect(screen.getByRole('group', { name: 'When picker' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'June 17, 2026' }).getAttribute('aria-pressed')).toBe(
    'true',
  );

  open();
  expect(screen.queryByRole('group', { name: 'When picker' })).toBeNull();
});

test('picking a day keeps the time of day; navigating months works', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'June 3, 2026' }));
  expect(value()).toBe('2026-06-03T14:30');
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  fireEvent.click(screen.getByRole('button', { name: 'July 9, 2026' }));
  expect(value()).toBe('2026-07-09T14:30');
});

test('hour and minute are editable and clamped to a valid time', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  open();
  fireEvent.change(screen.getByLabelText('When hour'), { target: { value: '9' } });
  expect(value()).toBe('2026-06-17T09:30');
  fireEvent.change(screen.getByLabelText('When minute'), { target: { value: '99' } });
  expect(value()).toBe('2026-06-17T09:59');
});

test('days outside min/max are disabled, and a time past a bound is clamped to it', () => {
  render(<Harness initial="2026-06-17T14:30" min="2026-06-10T08:00" max="2026-06-20T18:00" />);
  open();
  expect((screen.getByRole('button', { name: 'June 9, 2026' }) as HTMLButtonElement).disabled).toBe(
    true,
  );

  expect(
    (screen.getByRole('button', { name: 'June 21, 2026' }) as HTMLButtonElement).disabled,
  ).toBe(true);

  expect(
    (screen.getByRole('button', { name: 'June 10, 2026' }) as HTMLButtonElement).disabled,
  ).toBe(false);

  fireEvent.click(screen.getByRole('button', { name: 'June 20, 2026' }));
  fireEvent.change(screen.getByLabelText('When hour'), { target: { value: '23' } });
  expect(value()).toBe('2026-06-20T18:00');
});

test('the popover closes on Escape and on a press outside it, but not on a press inside', () => {
  render(
    <>
      <Harness initial="2026-06-17T14:30" />
      <button type="button">elsewhere</button>
    </>,
  );

  open();
  fireEvent.pointerDown(screen.getByRole('group', { name: 'When picker' }));
  expect(screen.getByRole('group', { name: 'When picker' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('group', { name: 'When picker' })).toBeNull();
  open();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }));
  expect(screen.queryByRole('group', { name: 'When picker' })).toBeNull();
});

test('the calendar is positioned, sized and layered from theme tokens, not inline styles', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  open();
  const picker = screen.getByRole('group', { name: 'When picker' });
  const style = getComputedStyle(picker);
  expect(picker.getAttribute('style')).toBeNull();
  expect(style.position).toBe('absolute');
  expect(style.width).toBe('288px');
  expect(style.zIndex).toBe('30');
  // Hangs under the field with one theme space of 8px between them, aligned to one edge.
  expect(style.top).toBe('calc(100% + 8px)');
  expect(style.left === '0px' || style.right === '0px').toBe(true);
});

test('the days are a seven-column grid of round buttons, from e-prim props', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  open();
  const day = screen.getByRole('button', { name: 'June 17, 2026' });
  const grid = day.parentElement as HTMLElement;
  expect(grid.getAttribute('style')).toBeNull();
  expect(getComputedStyle(grid).display).toBe('grid');
  expect(getComputedStyle(grid).gridTemplateColumns).toBe('repeat(7, 1fr)');
  expect(getComputedStyle(grid).gap).toBe('2px');
  expect(day.getAttribute('style')).toBeNull();
  expect(getComputedStyle(day).width).toBe('32px');
  expect(getComputedStyle(day).height).toBe('32px');
  expect(getComputedStyle(day).borderRadius).toBe('999px');
  // The weekday headings get their vertical padding from the spacing props.
  expect(getComputedStyle(screen.getByText('Mon')).paddingTop).toBe('4px');
});

test('the month arrows are 28px round buttons without inline styles', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  open();
  const arrow = screen.getByRole('button', { name: 'Previous month' });
  expect(arrow.getAttribute('style')).toBeNull();
  expect(getComputedStyle(arrow).width).toBe('28px');
  expect(getComputedStyle(arrow).height).toBe('28px');
  expect(getComputedStyle(arrow).borderRadius).toBe('999px');
});

test('the time boxes get their size, spacing, border, colors and alignment from props, and their font from the theme', () => {
  render(<Harness initial="2026-06-17T14:30" />);
  open();
  const hour = screen.getByRole('spinbutton', { name: 'When hour' });
  const style = getComputedStyle(hour);
  expect(hour.getAttribute('style')).toBeNull();
  expect(style.width).toBe('44px');
  expect(style.paddingTop).toBe('4px');
  expect(style.paddingLeft).toBe('6px');
  expect(style.borderTopWidth).toBe('1px');
  expect(style.textAlign).toBe('center');
  expect(style.backgroundColor).toBe('rgb(33, 30, 38)'); // the dark theme's surfaceRaised
  expect(style.color).toBe('rgb(242, 239, 234)');
  expect(style.fontVariantNumeric).toBe('tabular-nums');
  // The font is the app's, from the theme's body typography, with no `font: inherit` needed.
  expect(style.fontSize).toBe('13px');
  expect(style.fontFamily).toBe(getComputedStyle(document.body).fontFamily);
});
