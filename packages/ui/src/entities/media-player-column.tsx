/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hash/core';
import { Flex } from 'e-prim';
import type { ReactNode } from 'react';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { HoldProgress } from '../layout/hold-progress.tsx';
import { IconButton } from '../layout/tile.tsx';
import { DrawerTrigger } from '../layout/use-drawer.tsx';
import { useHold } from '../layout/use-hold.ts';
import { MediaBrowser } from './media-browser.tsx';
import { MediaPlayerBody } from './media-player-body.tsx';
import { NowPlaying } from './now-playing.tsx';

export interface MediaPlayerColumnProps {
  /** A media player, as a ref like `ma:kitchen` or `ha:media_player.kitchen`, or a handle (a custom source). */
  entity: EntityRef | EntityHandle<'mediaPlayer'>;

  /** What to call the player: the drawer's title and the name shown when nothing is playing. Defaults to the player's own name. */
  name?: string;

  /** Content for the media browser shown with the player in the drawer. By default a `MediaBrowser` over the player's own library, shown only for a ref whose player has one; pass your own content to replace it, or `false` for no drawer. */
  browse?: ReactNode | false;
}

/** The player as an upright card for a narrow column beside a dashboard (a quarter to a third of
 * the width): the artwork in a ring that shows (and seeks) the position, title, transport and a
 * volume bar that is always visible. It is only as tall as it needs to be. Holding the card or
 * pressing the artwork opens the drawer with the player and its library; the browse button opens
 * that drawer expanded. */
export function MediaPlayerColumn({ entity, name, browse }: MediaPlayerColumnProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const player = handle.entity;
  const ref = typeof entity === 'string' ? entity : undefined;
  const browser =
    browse === false
      ? undefined
      : (browse ??
        (ref && player?.capabilities.browse ? (
          <MediaBrowser entity={ref} layout="auto" />
        ) : undefined));

  const fallback = fallbackName(entity);

  return browser !== undefined && handle.status === 'ready' ? (
    <DrawerTrigger
      icon="lu:music"
      label={name ?? player?.name ?? fallback}
      kind="Media"
      body={
        <MediaPlayerBody
          entity={entity}
          browser={browser}
          {...(name !== undefined ? { name } : {})}
        />
      }
    >
      {(open, openExpanded) => (
        <Card open={open}>
          <NowPlaying
            handle={handle}
            fallback={fallback}
            {...(name !== undefined ? { name } : {})}
            onOpenArtwork={open}
            extra={
              <IconButton
                icon="lu:library"
                label="Browse media"
                glyph={18}
                onClick={openExpanded}
              />
            }
          />
        </Card>
      )}
    </DrawerTrigger>
  ) : (
    <Card>
      <NowPlaying handle={handle} fallback={fallback} {...(name !== undefined ? { name } : {})} />
    </Card>
  );
}

/** The card itself; with `open`, holding it (anywhere but on a control) calls it. */
function Card({ open, children }: { open?: () => void; children: ReactNode }) {
  const hold = useHold(() => open?.(), open !== undefined);
  return (
    <Flex
      direction="column"
      background="surface"
      radius="card"
      p={4}
      width="100%"
      // Only as tall as it needs, even in a parent that stretches its children.
      css={{ alignSelf: 'flex-start', position: 'relative', overflow: 'hidden' }}
      {...hold.handlers}
    >
      {children}
      {hold.holding ? <HoldProgress /> : null}
    </Flex>
  );
}
