import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { shouldLeave, useIdleReturn } from '../use-idle-return.ts';

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-06-01T12:00:00Z') }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const MIN = 60_000;

function Layout({ after = 5 * MIN }: { after?: number | false }) {
  useIdleReturn({ to: '/floor', after });
  const where = useLocation().pathname;
  const go = useNavigate();
  return (
    <>
      <output>{where}</output>
      <button type="button" onClick={() => go('/floor/music')}>
        music
      </button>
    </>
  );
}

const show = (start: string, after?: number | false) =>
  render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/floor/*" element={<Layout {...(after !== undefined ? { after } : {})} />} />
      </Routes>
    </MemoryRouter>,
  );

const at = () => screen.getByRole('status', { hidden: true }).textContent;

test('the check is whether the time has run out', () => {
  expect(shouldLeave(5 * MIN, 0, 5 * MIN)).toBe(true);
  expect(shouldLeave(5 * MIN - 1, 0, 5 * MIN)).toBe(false);
});

test('on another page, left alone, it goes back to the main page once the time is up', () => {
  show('/floor/music');
  act(() => vi.advanceTimersByTime(4 * MIN + 30_000));
  expect(at()).toBe('/floor/music');
  act(() => vi.advanceTimersByTime(40_000));
  expect(at()).toBe('/floor');
});

test('on the main page it does nothing, however long it is left, with or without a trailing slash', () => {
  show('/floor');
  act(() => vi.advanceTimersByTime(60 * MIN));
  expect(at()).toBe('/floor');
  cleanup();
  show('/floor/');
  act(() => vi.advanceTimersByTime(60 * MIN));
  expect(at()).toBe('/floor/');
});

test('the time counts from arriving on a page that is not the main one, and any touch starts it again', () => {
  show('/floor');
  act(() => vi.advanceTimersByTime(30 * MIN));
  act(() => screen.getByText('music').click());
  act(() => vi.advanceTimersByTime(4 * MIN));
  expect(at()).toBe('/floor/music');
  for (const kind of ['pointerdown', 'keydown', 'scroll', 'wheel']) {
    act(() => {
      window.dispatchEvent(new Event(kind));
    });

    act(() => vi.advanceTimersByTime(4 * MIN));
    expect(at()).toBe('/floor/music');
  }

  act(() => vi.advanceTimersByTime(6 * MIN));
  expect(at()).toBe('/floor');
});

test('false, or no time, turns it off', () => {
  show('/floor/music', false);
  act(() => vi.advanceTimersByTime(60 * MIN));
  expect(at()).toBe('/floor/music');
});
