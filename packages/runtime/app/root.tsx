import { DEFAULT_FONT, fontStack, googleFontHref, type ThemeMode } from '@hashsome/ui';
import { Links, Meta, Scripts, ScrollRestoration } from 'react-router';

const SHELL = {
  dark: { bg: '#101114', fg: '#e6e6e6' },
  light: { bg: '#f4f1eb', fg: '#211e26' },
};

/** Builds the document shell's `Layout`, painted before any client JS runs — so its background
 * needs to already roughly match the configured theme, or hydration visibly swaps the color out
 * from under the user. `'system'` can't know the OS preference at render time, so it ships both
 * colors and lets a plain CSS media query (not JS) pick the right one with no flash either way. A
 * schedule (by the clock or the sun) is not known yet either, so it starts as `'system'` does and
 * the app takes over once it is running.
 * The Google Fonts `<link>` is rendered here too (not left to `HashsomeProvider`'s own client-side
 * fallback) so the chosen font is already loading before hydration, not swapped in after. */
export function createLayout(theme: ThemeMode = 'dark', font: string = DEFAULT_FONT) {
  const followsSystem = typeof theme === 'object' || theme === 'system';
  const colorScheme = followsSystem ? 'light dark' : theme;
  const initial = theme === 'light' ? SHELL.light : SHELL.dark;
  const systemOverride = followsSystem
    ? `@media (prefers-color-scheme: light) { html, body { background: ${SHELL.light.bg}; color: ${SHELL.light.fg}; } }`
    : '';

  const kioskCss = `
    html, body { margin: 0; height: 100%; background: ${initial.bg}; color: ${initial.fg}; font-family: ${fontStack(font)}; }
    body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; user-select: none; }
    #root, body > div { min-height: 100%; }
    ${systemOverride}
  `;

  return function Layout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          />
          <meta name="color-scheme" content={colorScheme} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={googleFontHref(font)} data-hashsome-font="" />
          <style dangerouslySetInnerHTML={{ __html: kioskCss }} />
          <Meta />
          <Links />
        </head>
        <body>
          {children}
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    );
  };
}

/** Default shell, equivalent to `createLayout('dark', 'Inter')`. A project that picks another theme
 * or font should export `createLayout(theme, font)` as its own `Layout` instead (see
 * `example/app/root.tsx`). */
export const Layout = createLayout('dark');

export function HydrateFallback() {
  return null;
}
