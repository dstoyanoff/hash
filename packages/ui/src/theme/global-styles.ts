import type { Interpolation, Theme } from '@emotion/react';

function isDark(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return Number.isFinite(n) && ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) < 384;
}

/** The app-wide styles `HashProvider` installs once: the page background/text/font, native
 * controls following the theme, border-box sizing, and a low-specificity `button`/`input` reset (so a component's
 * own class always wins over it). Global because the theme is an app property, not a per-page one. */
export function globalStyles({ palette, typography }: Theme): Interpolation<Theme> {
  return {
    ':root': {
      // Native controls (date pickers' calendar glyph, scrollbars) follow the theme, not the OS.
      colorScheme: isDark(palette.bg) ? 'dark' : 'light',
    },
    '*, *::before, *::after': { boxSizing: 'border-box' },
    body: {
      background: palette.bg,
      color: palette.text,
      fontFamily: typography.default.fontFamily,
    },
    button: { font: 'inherit', color: 'inherit' },
    // Buttons and inputs start borderless; one that wants a border asks for it with the `border` prop.
    'button, input': { border: 0 },
  };
}
