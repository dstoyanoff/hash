/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hashsome/core';
import { Box, Flex } from 'e-prim';
import type { ReactNode } from 'react';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { useDetail } from '../layout/detail-provider.tsx';
import { NowPlaying } from './now-playing.tsx';

/** The artwork ring's diameter in a full-size player, against the usual 168px. */
const FULL_SIZE = 260;

export interface MediaPlayerFullProps {
  /** The media player, as a ref like `ma:living_room`. */
  entity: EntityRef | EntityHandle<'mediaPlayer'>;

  /** What goes below the player, usually the player's library: `<MediaBrowser entity="ma:living_room" layout="theater" />`. Left out, only the player is drawn. */
  browser?: ReactNode;

  /** What goes beside the player in a wide space, usually the player's queue: `<MediaQueue entity="ma:living_room" />`. Only used when `wide` and the player has a queue; the narrow layout has no room for it. */
  queue?: ReactNode;

  /** Calls the player this instead of the name it reports. */
  name?: string;

  /** Gives the library the whole width, for one laid out to use it (the theater layout). Defaults to whether the drawer is expanded. */
  wide?: boolean;
}

/** The big player: the player centered at the top, and the library (or whatever `browser` is) below
 * it. It is what the media cards' drawers show, at every width, and it is the widget a dashboard puts
 * in a page of its own, around it whatever it likes (a surface that fills the space and scrolls, a
 * heading, other cards beside it). It fills the height it is given, so the page that holds it
 * decides how tall that is. */
export function MediaPlayerFull({ entity, browser, queue, wide, name }: MediaPlayerFullProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const { detail } = useDetail();
  const full = wide ?? detail?.expanded === true;
  return (
    <Flex direction="column" gap={5} grow={1} minHeight={0}>
      {/* Full size, the player is larger and centered in whatever room the library leaves, with the
          library docked to the bottom. In the narrower drawer everything just stacks from the top. */}
      <Flex
        align="stretch"
        justify="center"
        gap={6}
        {...(full ? { grow: 1 } : {})}
        css={{ flexShrink: 0 }}
      >
        <Flex align="center" justify="center" grow={1} minWidth={0}>
          <Box width="100%" maxWidth={full ? 560 : 420}>
            <NowPlaying
              handle={handle}
              fallback={fallbackName(entity)}
              {...(name !== undefined ? { name } : {})}
              shuffle="title"
              {...(full ? { size: FULL_SIZE } : {})}
            />
          </Box>
        </Flex>
        {full && queue !== undefined && handle.entity?.capabilities.queue === true ? (
          // Beside the player, as tall as it is and no taller: a long queue scrolls inside.
          <Flex direction="column" width={400} minHeight={0} css={{ flex: 'none', maxHeight: 560 }}>
            {queue}
          </Flex>
        ) : null}
      </Flex>
      {browser !== undefined ? (
        <>
          <Box height={1} background="border" css={{ flexShrink: 0 }} />
          {/* A list is capped so a row is never a long way from its play button on a very wide
              screen; the theater row uses the whole width. The player stays put and the library
              is what scrolls, inside the space the drawer leaves it. */}
          <Flex
            direction="column"
            width="100%"
            minHeight={0}
            {...(full ? {} : { maxWidth: 960, mx: 'auto' })}
          >
            {browser}
          </Flex>
        </>
      ) : null}
    </Flex>
  );
}
