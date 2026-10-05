import type { Theme } from '@emotion/react';
import { expect, test } from 'vitest';
import { darkTheme } from '../index.ts';
import { globalStyles } from '../global-styles.ts';

type Rules = Record<string, Record<string, unknown>>;

const rules = (): Rules => globalStyles(darkTheme as unknown as Theme) as Rules;

test('scrollbars are thin, have no track, and use the theme’s colors', () => {
  const styles = rules();
  expect(styles['::-webkit-scrollbar']).toMatchObject({ width: 14, height: 14 });
  expect(styles['::-webkit-scrollbar-track, ::-webkit-scrollbar-corner']).toEqual({
    background: 'transparent',
  });

  expect(styles['::-webkit-scrollbar-thumb']).toMatchObject({
    background: darkTheme.palette.border,
    borderRadius: 999,
  });

  expect(styles['::-webkit-scrollbar-thumb:hover']).toMatchObject({
    background: darkTheme.palette.line,
  });
});

test('the thumb is a few pixels wide with room around it, so it never touches the content', () => {
  const thumb = rules()['::-webkit-scrollbar-thumb']!;
  const gap = Number.parseFloat(String(thumb.border));
  // 14px of scrollbar, 2 × 5px of transparent border, a 4px thumb.
  expect(gap).toBe(5);
  expect(14 - 2 * gap).toBe(4);
  expect(String(thumb.border)).toContain('transparent');
  expect(thumb.backgroundClip).toBe('padding-box');
});

test('browsers without ::-webkit-scrollbar get a thin bar from the standard properties', () => {
  const fallback = rules()['@supports not selector(::-webkit-scrollbar)']!;
  expect(fallback['*']).toMatchObject({ scrollbarWidth: 'thin' });
  // Set unconditionally they would turn the webkit rules off in Chrome.
  expect(Object.keys(rules())).not.toContain('*');
});
