import { act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { Page } from '../page.tsx';
import { RoomHeader } from '../room-header.tsx';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

test('a page draws no grid unless the device asked for it', () => {
  renderWithMock(
    <Page>
      <RoomHeader title="Kitchen" />
    </Page>,
    {},
  );

  expect(document.querySelector('[data-grid-overlay]')).toBeNull();
});

test('?grid draws the grid over the page, boxes each card and says how many are off the grid', async () => {
  window.history.replaceState({}, '', '/?grid');
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    // The header is a clean 32px at the page's origin; the page itself is 400 x 300.
    return this.tagName === 'HEADER'
      ? ({ left: 12, top: 12, width: 100, height: 32 } as DOMRect)
      : ({ left: 0, top: 0, width: 400, height: 300 } as DOMRect);
  });

  renderWithMock(
    <Page>
      <RoomHeader title="Kitchen" />
    </Page>,
    {},
  );

  await act(() => new Promise((done) => requestAnimationFrame(() => done(undefined))));
  expect(document.querySelector('[data-grid-overlay]')).not.toBeNull();
  expect(document.body.textContent).toContain('1u = 4px');
  expect(document.body.textContent).toContain('all on grid');
  // The one card is boxed, 32px = 8 modules tall.
  expect(document.body.textContent).toContain('8u');
});

test('the overlay is hidden from assistive technology', async () => {
  window.history.replaceState({}, '', '/?grid');
  renderWithMock(<Page>{null}</Page>, {});
  await act(() => new Promise((done) => requestAnimationFrame(() => done(undefined))));
  expect(document.querySelector('[data-grid-overlay]')?.getAttribute('aria-hidden')).toBe('true');
});
