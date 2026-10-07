/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hashsome/core';
import type { CSSObject } from '@emotion/react';
import { Flex, Typography } from 'e-prim';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Icon } from '../icon.tsx';
import { ValueBar } from '../layout/drawer-controls.tsx';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { DrawerTrigger } from '../layout/use-drawer.tsx';
import { HoldProgress } from '../layout/hold-progress.tsx';
import { useHold } from '../layout/use-hold.ts';
import { IconButton } from '../layout/tile.tsx';
import { statusLabels } from '../status.ts';
import { usePressFeedback, useVolumeControl } from './media-controls.ts';
import { Cover } from '../layout/cover.tsx';
import { PlainButton } from '../layout/plain-button.tsx';
import { MediaBrowser } from './media-browser.tsx';
import { MediaPlayerFull } from './media-player-full.tsx';
import { MediaQueue } from './media-queue.tsx';
import { formatDuration, useMediaPosition } from './media-progress.ts';
import { useSeekHold } from './media-seek.ts';
import { SeekLine } from './seek-line.tsx';

export interface MediaPlayerBarProps {
  /** A media player, as a ref like `ha:media_player.living_room` or `ma:living_room`, or a handle (a custom source). */
  entity: EntityRef | EntityHandle<'mediaPlayer'>;

  /** What to call the player: the drawer's title and the name shown when nothing is playing. Defaults to the player's own name. */
  name?: string;

  /** Content for the media browser shown with the player in the drawer. Holding the card or pressing the artwork opens the drawer; the browse button opens it expanded. By default a `MediaBrowser` over the player's own library, shown only for a ref whose player has one; pass your own content to replace it, or `false` for no browse button. */
  browse?: ReactNode | false;

  /** `1` puts the controls beside the track, in one pill; `2` puts them on a second row under it, for a narrow space (a small wall display). Default `'auto'`: one row, and two once the bar is narrower than 560 px wide. */
  rows?: 1 | 2 | 'auto';
}

/** Narrower than this, a bar with `rows="auto"` is two rows. */
const TWO_ROWS_BELOW = 560;

/** Glyph size inside the player's 44px circles — smaller than an icon's default so there is breathing room around it. */
const MEDIA_GLYPH = 18;

/** The ring around the artwork (the size of an icon circle): a button when there is somewhere to
 * go, otherwise just the ring. */
function Ring({ onOpen, children }: { onOpen?: (() => void) | undefined; children: ReactNode }) {
  return (
    <Flex
      {...(onOpen
        ? {
            as: 'button',
            type: 'button',
            'aria-label': 'Open player',
            title: 'Open player',
            onClick: onOpen,
            cursor: 'pointer',
          }
        : { as: 'span' })}
      data-part="ring"
      center
      position="relative"
      p={0}
      border
      radius="full"
      css={({ density }) => ({
        width: density.iconCircle,
        height: density.iconCircle,
        flex: 'none',
        background: 'none',
      })}
    >
      {children}
    </Flex>
  );
}

/** The same spring the swatch rows pop in with, so the volume overlay opens like they do. */
const VOLUME_SPRING = { type: 'spring', stiffness: 520, damping: 26 } as const;

/** What the pill is like in two rows: the artwork, "title · artist" and the time on top; under them
 * the buttons share the whole width, all of one size, and while the volume slider is open it has the
 * row to itself, with only the button that closes it. The bar is as tall as two regular tiles and
 * the gap between them (a tile is its icon circle and a spacing unit), so it sits in a grid of
 * tiles. A line break between the rows comes from an empty item that fills a line of its own. */
const stacked = ({
  radius,
  spacing,
  density,
}: {
  radius: { card: string };
  spacing: (n: number) => string;
  density: { iconCircle: number; space: number };
}): CSSObject => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  alignContent: 'center',
  columnGap: spacing(2.5),
  rowGap: 0,
  minHeight: 2 * (density.iconCircle + density.space / 3) + density.space,
  paddingTop: spacing(2.5),
  paddingBottom: spacing(2.5),
  borderRadius: radius.card,
  '&::before': { content: '""', order: 1, flexBasis: '100%', height: 0 },
  '& > [data-part="track"]': {
    flex: '1 1 0',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(1.5),
    // The artist follows the title on the same line, after a dot.
    '& > :nth-child(2)': {
      minWidth: 0,
      '&::before': { content: '"·"', marginRight: spacing(1.5) },
    },
  },
  '& [data-part="tools"], & [data-part="transport"]': { display: 'contents' },
  '& [data-part="tools"] > button, & [data-part="transport"] > button': {
    order: 2,
    flex: '1 1 0',
    minWidth: 0,
    width: 'auto',
    height: 34,
    marginTop: spacing(2.5),
  },
  '& [data-part="transport"] > button': { order: 4 },
  '& > [data-part="volume"]': {
    order: 3,
    flex: '1 1 0',
    minWidth: 0,
    marginTop: spacing(2.5),
  },
  '&[data-volume-open="true"]': {
    '& > [data-part="track"], & > [data-part="time"]': { display: 'flex' },
    // The slider has the row: only the button that closes it stays, a circle beside it.
    '& [data-part="tools"] > button:nth-of-type(n + 2), & [data-part="transport"] > button': {
      display: 'none',
    },
    '& [data-part="tools"] > button:first-of-type': { flex: 'none', width: 34 },
  },
});

/** The bar itself. Holding it (anywhere but on a button or slider) opens the drawer, with a thin
 * line along the top that fills while the press is timed, like a tile's. */
function HoldCard({
  open,
  status,
  rows,
  volumeOpen,
  children,
}: {
  open: (() => void) | undefined;
  status: string;
  rows: 1 | 2 | 'auto';
  volumeOpen: boolean;
  children: ReactNode;
}) {
  const hold = useHold(() => open?.(), open !== undefined);
  const card = (
    <Flex
      position="relative"
      align="center"
      grow={1}
      minWidth={0}
      gap={3}
      pl={2.25}
      pr={3}
      background="surface"
      radius="full"
      overflow="hidden"
      data-status={status}
      data-rows={rows === 2 ? 2 : undefined}
      data-volume-open={volumeOpen}
      css={(theme) => ({
        minHeight: theme.density.tileHeight,
        // In one row the volume slider takes the track's place; in two it has its own row.
        '&[data-volume-open="true"] > [data-part="track"], &[data-volume-open="true"] > [data-part="time"]':
          { display: 'none' },
        ...(rows === 2 ? stacked(theme) : {}),
        ...(rows === 'auto'
          ? { [`@container (max-width: ${TWO_ROWS_BELOW - 1}px)`]: stacked(theme) }
          : {}),
      })}
      {...hold.handlers}
    >
      {children}
      {hold.holding ? <HoldProgress /> : null}
    </Flex>
  );

  // `auto` asks the width the bar is given, so its parent is the thing measured.
  return rows === 'auto' ? (
    <Flex width="100%" css={{ containerType: 'inline-size' }}>
      {card}
    </Flex>
  ) : (
    card
  );
}

/** Now playing with previous / play-pause / next and a volume control, for a media player entity. */
export function MediaPlayerBar({ entity, name, browse, rows = 'auto' }: MediaPlayerBarProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const player = handle.entity;
  const status = handle.status;
  const [volumeOpen, setVolumeOpen] = useState(false);
  const ready = status === 'ready';
  const playing = player?.playback === 'playing';
  const muted = player?.muted === true;
  const caps = player?.capabilities;
  const { feedbackFor, press } = usePressFeedback();
  const volume = useVolumeControl(handle);

  const artwork = (
    <Flex
      as="span"
      center
      width={30}
      height={30}
      radius="full"
      overflow="hidden"
      background="surfaceRaised"
      color="textMuted"
    >
      {player?.media?.artworkUrl ? (
        <Cover src={player.media.artworkUrl} />
      ) : (
        <Icon name="lu:music" size={14} />
      )}
    </Flex>
  );

  const position = useMediaPosition(player);
  const seek = useSeekHold(
    ready ? position : undefined,
    caps?.seek ? (next) => void handle.command('seek', { position: next }) : undefined,
  );

  const duration = ready ? player?.duration : undefined;
  const timed = seek.shown !== undefined && duration !== undefined && duration > 0;

  const ref = typeof entity === 'string' ? entity : undefined;
  const browser =
    browse === false
      ? undefined
      : (browse ?? (ref && caps?.browse ? <MediaBrowser entity={ref} layout="auto" /> : undefined));

  const volumeSlider = (
    <Flex
      as={motion.div}
      align="center"
      gap={2}
      grow={1}
      minWidth={0}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      data-part="volume"
    >
      <PlainButton
        as={motion.button}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={VOLUME_SPRING}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        title={muted ? 'Unmute' : 'Mute'}
        onClick={volume.toggleMute}
        center
        color={muted ? 'accent' : 'textMuted'}
        css={{ flex: 'none' }}
      >
        <Icon name={muted ? 'lu:volume-x' : 'lu:volume-2'} size={16} />
      </PlainButton>
      <Flex
        as={motion.div}
        grow={1}
        minWidth={0}
        initial={{ scaleX: 0.4, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ ...VOLUME_SPRING, delay: 0.04 }}
        css={{ transformOrigin: 'left center' }}
      >
        <ValueBar
          label="Volume level"
          value={volume.shown}
          min={0}
          max={100}
          keyStep={5}
          height={10}
          onDrag={volume.drag}
          onCommit={volume.commit}
        />
      </Flex>
      <Typography
        as={motion.span}
        variant="secondary"
        color="textMuted"
        minWidth={32}
        align="right"
        css={{ flex: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {volume.shown}%
      </Typography>
    </Flex>
  );

  const trackInfo = (
    <>
      <Flex
        data-part="track"
        direction="column"
        grow={1}
        minWidth={0}
        {...(ready ? {} : { color: 'textMuted' as const })}
      >
        <Flex align="center" gap={1.5} minWidth={0}>
          <Typography as="span" variant="label" noWrap textOverflow="ellipsis">
            {ready
              ? (player?.media?.title ?? 'Nothing playing')
              : statusLabels[status as Exclude<typeof status, 'ready'>]}
          </Typography>
          {ready && caps?.shuffle ? (
            <PlainButton
              aria-label="Shuffle"
              aria-pressed={player?.shuffle === true}
              title="Shuffle"
              onClick={() =>
                void handle.command('setShuffle', { shuffle: player?.shuffle !== true })
              }
              center
              color={player?.shuffle === true ? 'accent' : 'textMuted'}
              css={{ flex: 'none' }}
            >
              <Icon name="lu:shuffle" size={14} />
            </PlainButton>
          ) : null}
        </Flex>
        {ready && player?.media?.artist ? (
          <Typography
            as="span"
            variant="secondary"
            color="textMuted"
            noWrap
            textOverflow="ellipsis"
          >
            {player.media.artist}
          </Typography>
        ) : null}
      </Flex>
    </>
  );

  const bar = (open?: () => void, openExpanded?: () => void) => (
    <HoldCard open={open} status={status} rows={rows} volumeOpen={volumeOpen && ready}>
      {/* A ring (the old artwork size) around the artwork, which is as tall as the title + artist
          lines beside it. */}
      <Ring onOpen={open}>{artwork}</Ring>
      {trackInfo}
      {/* The time sits at the vertical middle of the bar, beside the track; in two rows it is at the
          right of the top row. The volume slider takes the track's and the time's place in one row. */}
      {timed ? (
        <Typography
          as="span"
          data-part="time"
          variant="secondary"
          color="textMuted"
          noWrap
          css={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatDuration(seek.shown ?? 0)} / {formatDuration(duration ?? 0)}
        </Typography>
      ) : null}
      {volumeOpen && ready ? volumeSlider : null}
      <Flex data-part="tools" align="center" gap={3} css={{ flex: 'none' }}>
        <IconButton
          icon={volumeOpen ? 'lu:x' : muted ? 'lu:volume-x' : 'lu:volume-2'}
          label={volumeOpen ? 'Close volume' : 'Volume'}
          glyph={MEDIA_GLYPH}
          disabled={!ready || (caps?.volume === false && caps.mute === false)}
          onClick={() => setVolumeOpen((current) => !current)}
        />
        {open && browser !== undefined ? (
          <IconButton
            icon="lu:library"
            label="Browse media"
            glyph={MEDIA_GLYPH}
            onClick={openExpanded ?? open}
          />
        ) : null}
      </Flex>
      <Flex data-part="transport" align="center" gap={3} css={{ flex: 'none' }}>
        <IconButton
          icon="lu:skip-back"
          label="Previous"
          glyph={MEDIA_GLYPH}
          disabled={!ready || caps?.previous === false}
          feedback={feedbackFor('previous')}
          onClick={() => press('previous', () => handle.command('previous'))}
        />
        <IconButton
          icon={playing ? 'lu:pause' : 'lu:play'}
          label={playing ? 'Pause' : 'Play'}
          glyph={MEDIA_GLYPH}
          disabled={!ready}
          primary
          onClick={() => void handle.command('togglePlay')}
        />
        <IconButton
          icon="lu:skip-forward"
          label="Next"
          glyph={MEDIA_GLYPH}
          disabled={!ready || caps?.next === false}
          feedback={feedbackFor('next')}
          onClick={() => press('next', () => handle.command('next'))}
        />
      </Flex>
      {timed ? (
        <SeekLine seek={seek} duration={duration ?? 0} seekable={caps?.seek === true} />
      ) : null}
    </HoldCard>
  );

  // Holding the card, the artwork and the browse button open the same drawer: the player laid out
  // like the vertical one, with the library below it.
  return ready ? (
    <DrawerTrigger
      icon="lu:music"
      label={name ?? player?.name ?? fallbackName(entity)}
      kind="Media"
      body={
        <MediaPlayerFull
          entity={entity}
          {...(name !== undefined ? { name } : {})}
          {...(browser !== undefined ? { browser } : {})}
          {...(typeof entity === 'string' ? { queue: <MediaQueue entity={entity} /> } : {})}
        />
      }
    >
      {(open, openExpanded) => bar(open, openExpanded)}
    </DrawerTrigger>
  ) : (
    bar()
  );
}
