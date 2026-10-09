import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { ChipRow } from '../drawer-controls.tsx';
import { FADE } from '../fade-scroll.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const options = [
  { value: 'a', label: 'Recently played' },
  { value: 'b', label: 'Playlists' },
  { value: 'c', label: 'Albums' },
];

/** jsdom has no layout: say where the row and the chips are. */
const place = (row: [number, number], chip: [number, number]) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const [left, right] =
      this.getAttribute('role') === 'tablist'
        ? row
        : this.getAttribute('aria-selected') === 'true'
          ? chip
          : [0, 10];

    return {
      left,
      right,
      top: 0,
      bottom: 28,
      width: right - left,
      height: 28,
      x: left,
      y: 0,
    } as DOMRect;
  });
};

test('a selected tab that is out of the row scrolls to its start, clear of the fade, and one in view leaves the row alone', async () => {
  place([0, 200], [260, 360]);
  const { unmount } = renderWithMock(
    <ChipRow tabs options={options} value="c" onChange={() => {}} />,
    {},
  );

  const row = screen.getByRole('tablist');
  await waitFor(() => expect(row.scrollLeft).toBeCloseTo(260 - FADE, 0), { timeout: 2000 });
  unmount();

  place([0, 200], [20, 120]);
  renderWithMock(<ChipRow tabs options={options} value="a" onChange={() => {}} />, {});
  expect(screen.getByRole('tablist').scrollLeft).toBe(0);
});
