import { RemoteClient, type Client, type RemoteClientOptions } from '@hash/core';
import { Global, ThemeProvider as EmotionThemeProvider, type Theme } from '@emotion/react';
import { ThemeProvider } from 'e-prim';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DetailProvider } from './layout/detail-provider.tsx';
import { EntityDrawer } from './layout/entity-drawer.tsx';
import { UNITS_PER_SPACE, type Density } from './theme/density.ts';
import { globalStyles } from './theme/global-styles.ts';
import { applyThemeOverrides, densityTokens, type ThemeOverrides } from './theme/overrides.ts';
import {
  DEFAULT_FONT,
  darkTheme,
  googleFontHref,
  lightTheme,
  withFontFamily,
} from './theme/index.ts';

const HashContext = createContext<Client | null>(null);

export type ThemeMode = 'light' | 'dark' | 'system';

export interface HashProviderProps {
  /** Runtime WebSocket URL. Defaults to `/ws` on the current origin. */
  url?: string;

  /** Provide a ready-made client (gallery, tests). */
  client?: Client;

  /** Options for the default `RemoteClient` (reconnect timing, a custom socket factory). Ignored when `client` is given. */
  clientOptions?: Omit<RemoteClientOptions, 'url'>;

  /** `'system'` follows the browser/OS preference and updates live. Default `'dark'`. A `useThemeToggle()` caller (e.g. `NavRail`'s dev toggle) can still override this at runtime. */
  theme?: ThemeMode;

  /** Any Google Fonts family name (e.g. `'Inter'`, `'Roboto'`, `'Poppins'`), loaded dynamically. Default `'Inter'`. */
  font?: string;

  /** `'compact'` for small square displays: tighter spacing, shorter tiles, smaller icon circles. Default `'comfortable'`. */
  density?: Density;

  /** Partial changes to the built-in theme — colors per light/dark, radii, typography, spacing, density sizes. Pass a constant defined outside the component: a new object each render rebuilds the theme each render. */
  overrides?: ThemeOverrides;

  /** The app. */
  children: ReactNode;
}

/** Loads a Google Fonts family at runtime via a single `<link>` this hook owns and reuses (keyed
 * by a `data-hash-font` marker, not the family, so switching fonts updates it in place instead of
 * accumulating stale `<link>` tags). A no-op outside the browser (SSR has no `document`). */
function useGoogleFont(family: string) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let link = document.querySelector<HTMLLinkElement>('link[data-hash-font]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.hashFont = '';
      document.head.appendChild(link);
    }

    link.href = googleFontHref(family);
  }, [family]);
}

function defaultUrl(): string {
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;
}

// jsdom (unit tests) has no `matchMedia` — guarded so only `theme="system"` ever touches it, and
// even then it degrades to `false` instead of throwing if a test environment lacks it too.
function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export interface ThemeModeState {
  /** The theme actually in effect right now — never `'system'`, already resolved against the
   * live OS preference and any `useThemeToggle()` override. */
  resolved: 'light' | 'dark';

  /** Flips between light and dark, overriding the configured `theme` (including `'system'`) until
   * the page reloads. */
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeState | null>(null);

/** Reads the live light/dark state and a way to flip it — e.g. a dev-only toggle in `NavRail`.
 * Must be rendered inside `<HashProvider>`. */
export function useThemeToggle(): ThemeModeState {
  const value = useContext(ThemeModeContext);
  if (!value) {
    throw new Error('useThemeToggle() must be used inside <HashProvider>');
  }

  return value;
}

/** Resolves `'system'` against the live OS/browser preference, updating if it changes while open —
 * a kiosk tablet left running overnight should follow a scheduled OS-level dark mode, for example.
 * `override` (set via `useThemeToggle().toggle()`) wins over both until the page reloads. */
function useThemeMode(mode: ThemeMode): ThemeModeState {
  const [systemDark, setSystemDark] = useState(() => mode === 'system' && systemPrefersDark());
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode]);

  const configured: 'light' | 'dark' =
    mode === 'light' ? 'light' : mode === 'dark' ? 'dark' : systemDark ? 'dark' : 'light';

  const resolved = override ?? configured;

  return { resolved, toggle: () => setOverride(resolved === 'dark' ? 'light' : 'dark') };
}

/** Connects the tree to the runtime proxy. Render only on the client. */
export function HashProvider({
  url,
  client,
  clientOptions,
  theme = 'dark',
  font = DEFAULT_FONT,
  density = 'comfortable',
  overrides,
  children,
}: HashProviderProps) {
  const instance = useMemo<Client>(
    () => client ?? new RemoteClient({ url: url ?? defaultUrl(), ...clientOptions }),
    [client, url, clientOptions],
  );

  const themeMode = useThemeMode(theme);
  // Memoized: Emotion recomputes the merged theme (and every `css` prop) when the function changes.
  const withDensity = useMemo(
    () =>
      (outer: Theme): Theme => ({ ...outer, density: densityTokens(density, overrides) }),
    [density, overrides],
  );

  useGoogleFont(font);
  const resolvedTheme = useMemo(
    () => ({
      ...withFontFamily(
        applyThemeOverrides(
          themeMode.resolved === 'dark' ? darkTheme : lightTheme,
          themeMode.resolved,
          overrides,
        ),
        font,
      ),
      // The spacing unit follows density, so `gap={3}` is always one space and the rest scale.
      spacing: densityTokens(density, overrides).space / UNITS_PER_SPACE,
    }),
    [themeMode.resolved, font, overrides, density],
  );

  useEffect(() => {
    instance.connect();
    return () => instance.close();
  }, [instance]);

  return (
    <HashContext.Provider value={instance}>
      <ThemeModeContext.Provider value={themeMode}>
        <ThemeProvider theme={resolvedTheme}>
          <EmotionThemeProvider theme={withDensity}>
            <Global styles={globalStyles} />
            <DetailProvider>
              {children}
              <EntityDrawer />
            </DetailProvider>
          </EmotionThemeProvider>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </HashContext.Provider>
  );
}

export function useClient(): Client {
  const client = useContext(HashContext);
  if (!client) {
    throw new Error('Hash hooks must be used inside <HashProvider>');
  }

  return client;
}
