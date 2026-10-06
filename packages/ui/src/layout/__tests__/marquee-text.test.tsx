import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MarqueeText } from '../marquee-text.tsx';

/** jsdom lays nothing out, so say how wide the frame and the text are. */
function measured(frame: number, text: number) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(frame);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(text);
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const frameOf = () => screen.getByText('A very long title').parentElement as HTMLElement;

test('text that fits just sits there, ending in an ellipsis if it ever outgrows its room', () => {
  measured(200, 120);
  render(<MarqueeText>A very long title</MarqueeText>);
  expect(frameOf().textContent).toBe('A very long title');
  expect(getComputedStyle(frameOf()).overflow).toBe('hidden');
  expect(getComputedStyle(frameOf()).textOverflow).toBe('ellipsis');
});

test('text wider than its room is clipped and rolls instead of ending in an ellipsis', () => {
  measured(100, 260);
  render(<MarqueeText>A very long title</MarqueeText>);
  expect(getComputedStyle(frameOf()).overflow).toBe('hidden');
  expect(getComputedStyle(frameOf()).whiteSpace).toBe('nowrap');
  expect(getComputedStyle(frameOf()).textOverflow).toBe('clip');
});

test('it never grows past the room it is given, so a long title cannot push its tile out of shape', () => {
  measured(100, 260);
  render(<MarqueeText>A very long title</MarqueeText>);
  expect(getComputedStyle(frameOf()).maxWidth).toBe('100%');
  expect(getComputedStyle(frameOf()).display).toBe('block');
});

test('it has a line height of its own, so a title with an emoji is no taller than one without', () => {
  measured(200, 120);
  render(<MarqueeText>A very long title</MarqueeText>);
  // An emoji is drawn from another font with a taller line; a fixed line height keeps the row the same.
  expect(getComputedStyle(frameOf()).lineHeight).toBe('1.3');
});
