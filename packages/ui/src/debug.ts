import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** What the debug menu can set the theme to. `sun` follows a daylight sensor (the configured one, or `ha:sun.sun`). */
export type ThemeChoice = 'light' | 'dark' | 'system' | 'sun';

export const THEME_CHOICES: ThemeChoice[] = ['light', 'dark', 'system', 'sun'];

const GRID_KEY = 'hashsome:grid';
const THEME_KEY = 'hashsome:theme';
const FULLSCREEN_KEY = 'hashsome:fullscreen';

/** Set by the runtime from `HASHSOME_DEBUG` (see `createViteConfig`): Vite replaces it in the code it
 * serves and builds, `@hashsome/ui` included. Not there at all in the gallery and in tests. */
declare const HASHSOME_DEBUG_ON: boolean | undefined;

/** Whether the build or run was asked for the debug menu: `HASHSOME_DEBUG=1` (or `true`) in the
 * environment of `hashsome dev` or `hashsome build`. A production build has it only if it was built with it. */
export function debugFromEnv(): boolean {
  return typeof HASHSOME_DEBUG_ON !== 'undefined' && HASHSOME_DEBUG_ON === true;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Without storage the choice just lasts until the page is closed.
  }
}

/** What the debug menu has set, kept on the device and handed down by `HashsomeProvider`. */
export interface DebugState {
  /** The module grid is drawn over the page. */
  grid: boolean;
  setGrid: (on: boolean) => void;

  /** The theme the menu chose, over the one the project configured; `null` until it chooses. */
  themeChoice: ThemeChoice | null;
  setThemeChoice: (choice: ThemeChoice | null) => void;

  /** The page should be fullscreen: the first touch after a reload makes it so again. */
  fullscreen: boolean;
  setFullscreen: (on: boolean) => void;
}

const OFF: DebugState = {
  grid: false,
  setGrid: () => undefined,
  themeChoice: null,
  setThemeChoice: () => undefined,
  fullscreen: false,
  setFullscreen: () => undefined,
};

export const DebugContext = createContext<DebugState>(OFF);

/** What the debug menu has set; everything off outside a `HashsomeProvider`. */
export function useDebug(): DebugState {
  return useContext(DebugContext);
}

/** The state `HashsomeProvider` keeps: read from the device once, written back on each change. */
export function useDebugState(): DebugState {
  const [grid, setGridState] = useState(() => read(GRID_KEY) === 'on');
  const [fullscreen, setFullscreenState] = useState(() => read(FULLSCREEN_KEY) === 'on');
  const [themeChoice, setThemeState] = useState<ThemeChoice | null>(() => {
    const kept = read(THEME_KEY);
    return THEME_CHOICES.find((choice) => choice === kept) ?? null;
  });

  // Stable: the setters are dependencies of effects, and a new one each render would run them each render.
  const setGrid = useCallback((on: boolean) => {
    write(GRID_KEY, on ? 'on' : null);
    setGridState(on);
  }, []);

  const setThemeChoice = useCallback((choice: ThemeChoice | null) => {
    write(THEME_KEY, choice);
    setThemeState(choice);
  }, []);

  const setFullscreen = useCallback((on: boolean) => {
    write(FULLSCREEN_KEY, on ? 'on' : null);
    setFullscreenState(on);
  }, []);

  return useMemo(
    () => ({ grid, setGrid, themeChoice, setThemeChoice, fullscreen, setFullscreen }),
    [grid, setGrid, themeChoice, setThemeChoice, fullscreen, setFullscreen],
  );
}

/** Keeps the page's fullscreen as `wanted` says. A browser only allows entering fullscreen in answer
 * to a touch, so after a reload (which always leaves it) the first touch puts the page back; leaving
 * it by the system's own gesture turns `wanted` off, so the next touch does not pull it back in. */
export function useFullscreenKept(wanted: boolean, setWanted: (on: boolean) => void): void {
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fullscreenEnabled) {
      return;
    }

    const enter = () => {
      if (wanted && !document.fullscreenElement) {
        document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
      }
    };

    const onChange = () => {
      if (!document.fullscreenElement && wanted) {
        setWanted(false);
      }
    };

    document.addEventListener('fullscreenchange', onChange);
    if (wanted && !document.fullscreenElement) {
      window.addEventListener('pointerup', enter, { once: true });
    }

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('pointerup', enter);
    };
  }, [wanted, setWanted]);
}
