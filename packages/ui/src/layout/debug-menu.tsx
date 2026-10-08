/** @jsxImportSource @emotion/react */
import { Flex, Typography } from 'e-prim';
import { useEffect, useRef, useState } from 'react';
import { THEME_CHOICES, useDebug, type ThemeChoice } from '../debug.ts';
import { Icon } from '../icon.tsx';
import type { ThemeMode } from '../provider.tsx';
import { ChipRow } from './drawer-controls.tsx';
import { PlainButton } from './plain-button.tsx';

const THEME_LABELS: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  sun: 'Sun',
};

const ON_OFF = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

/** The theme the project configured, as the menu's own choice, for showing which is in effect when
 * the menu has not chosen. A schedule by the clock is none of them. */
function configuredChoice(configured: ThemeMode | undefined): ThemeChoice | undefined {
  if (configured === undefined) {
    return 'dark';
  }

  if (typeof configured === 'string') {
    return configured;
  }

  return 'sun' in configured ? 'sun' : undefined;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap={2}>
      <Typography as="span" variant="label" color="textMuted">
        {label}
      </Typography>
      {children}
    </Flex>
  );
}

/** A floating button at the bottom left, for working on a dashboard on the device it is for: its
 * popover shows the module grid over the page, makes the page fullscreen, and changes the theme
 * (light, dark, the system's, or the sun's). What it sets is kept on the device. Only there when
 * `HashsomeProvider` has `debug` on (`HASHSOME_DEBUG=1`), and not exported. */
export function DebugMenu({ configured }: { configured?: ThemeMode }) {
  const debug = useDebug();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement !== null,
  );

  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled === true;

  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Closes on a touch anywhere else, and on Escape.
  useEffect(() => {
    if (!open) {
      return;
    }

    const away = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const toggleFullscreen = (on: boolean) => {
    // Asked for in the touch itself: a browser only allows it as the answer to one.
    if (on) {
      void document.documentElement
        .requestFullscreen({ navigationUI: 'hide' })
        .catch(() => undefined);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    debug.setFullscreen(on);
  };

  const theme = debug.themeChoice ?? configuredChoice(configured);

  return (
    <Flex
      ref={root}
      data-debug-menu
      // As big as the button, whatever the page's own rules say: the document shell makes every `div`
      // that is a child of `body` at least as tall as the window (`body > div { min-height: 100% }`),
      // which this is, and the button would sit at the top of it.
      css={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 30,
        width: 40,
        height: 40,
        minHeight: 0,
      }}
    >
      {open ? (
        <Flex
          role="dialog"
          aria-label="Debug"
          direction="column"
          gap={4}
          background="surface"
          radius="row"
          shadow="drawer"
          p={4}
          width={288}
          css={{ position: 'absolute', left: 0, bottom: 52, boxSizing: 'border-box' }}
        >
          <Row label="Show grid">
            <ChipRow
              options={ON_OFF}
              value={debug.grid ? 'on' : 'off'}
              onChange={(value) => debug.setGrid(value === 'on')}
            />
          </Row>
          <Row label="Fullscreen">
            {canFullscreen ? (
              <ChipRow
                options={ON_OFF}
                value={isFull ? 'on' : 'off'}
                onChange={(value) => toggleFullscreen(value === 'on')}
              />
            ) : (
              <Typography as="span" variant="secondary" color="textMuted">
                Not available in this browser.
              </Typography>
            )}
          </Row>
          <Row label="Theme">
            <ChipRow
              options={THEME_CHOICES.map((choice) => ({
                value: choice,
                label: THEME_LABELS[choice],
              }))}
              value={theme}
              onChange={(value) => debug.setThemeChoice(value as ThemeChoice)}
            />
          </Row>
        </Flex>
      ) : null}
      <PlainButton
        aria-label="Debug menu"
        title="Debug menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        center
        radius="full"
        background="surface"
        color="textMuted"
        shadow="dock"
        width={40}
        height={40}
        css={{ flex: 'none' }}
      >
        <Icon name="lu:bug" size={18} />
      </PlainButton>
    </Flex>
  );
}
