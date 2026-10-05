/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hash/core';
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
import { MediaPlayerBody } from './media-player-body.tsx';
import { formatDuration, useMediaPosition } from './media-progress.ts';
import { useSeekHold } from './media-seek.ts';
import { SeekLine } from './seek-line.tsx';

export interface MediaPlayerBarProps {
  /** A media player, as a ref like `ha:media_player.living_room` or `ma:living_room`, or a handle (a custom source). */
  entity: EntityRef | EntityHandle<'mediaPlayer'>;

  /** Content for the media browser shown with the player in the drawer. Holding the card or pressing the artwork opens the drawer; the browse button opens it expanded. By default a `MediaBrowser` over the player's own library, shown only for a ref whose player has one; pass your own content to replace it, or `false` for no browse button. */
  browse?: ReactNode | false;
}

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

/** The bar itself. Holding it (anywhere but on a button or slider) opens the drawer, with a thin
 * line along the top that fills while the press is timed, like a tile's. */
function HoldCard({
  open,
  status,
  children,
}: {
  open: (() => void) | undefined;
  status: string;
  children: ReactNode;
}) {
  const hold = useHold(() => open?.(), open !== undefined);
  return (
    <Flex
      position="relative"
      align="center"
      gap={3}
      pl={2.25}
      pr={3}
      background="surface"
      radius="full"
      overflow="hidden"
      data-status={status}
      css={({ density }) => ({ minHeight: density.tileHeight })}
      {...hold.handlers}
    >
      {children}
      {hold.holding ? <HoldProgress /> : null}
    </Flex>
  );
}

/** Now playing with previous / play-pause / next and a volume control, for a media player entity. */
export function MediaPlayerBar({ entity, browse }: MediaPlayerBarProps) {
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

  const bar = (open?: () => void, openExpanded?: () => void) => (
    <HoldCard open={open} status={status}>
      {/* A ring (the old artwork size) around the artwork, which is as tall as the title + artist
          lines beside it. */}
      <Ring onOpen={open}>{artwork}</Ring>
      {volumeOpen && ready ? (
        <Flex
          as={motion.div}
          align="center"
          gap={2}
          grow={1}
          minWidth={0}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
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
      ) : (
        <>
          <Flex
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
          {/* The time sits at the vertical middle of the bar, beside the track, not in a text row. */}
          {timed ? (
            <Typography
              as="span"
              variant="secondary"
              color="textMuted"
              noWrap
              css={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatDuration(seek.shown ?? 0)} / {formatDuration(duration ?? 0)}
            </Typography>
          ) : null}
        </>
      )}
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
      label={player?.name ?? fallbackName(entity)}
      kind="Media"
      body={<MediaPlayerBody entity={entity} {...(browser !== undefined ? { browser } : {})} />}
    >
      {(open, openExpanded) => bar(open, openExpanded)}
    </DrawerTrigger>
  ) : (
    bar()
  );
}
