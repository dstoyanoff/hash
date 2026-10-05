/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hash/core';
import { Box, Flex } from 'e-prim';
import type { ReactNode } from 'react';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { useDetail } from '../layout/detail-provider.tsx';
import { NowPlaying } from './now-playing.tsx';

/** The artwork ring's diameter in a full-size player, against the usual 168px. */
const FULL_SIZE = 260;

/** The big player: the player centered at the top, and the library (or whatever `browser` is)
 * below it. This one layout is the drawer, at every width, and the full page, so the two are the
 * same thing and cannot drift apart. Not exported from the package; `MediaPlayerPage` and the
 * media cards' drawers draw it. */
export function MediaPlayerBody({
  entity,
  browser,
  wide,
}: {
  entity: EntityRef | EntityHandle<'mediaPlayer'>;
  browser?: ReactNode;

  /** Gives the library the whole width, for one laid out to use it (the theater layout). Defaults to whether the drawer is expanded. */
  wide?: boolean;
}) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const { detail } = useDetail();
  const full = wide ?? detail?.expanded === true;
  return (
    <Flex direction="column" gap={5} grow={1} minHeight={0}>
      {/* Full size, the player is larger and centered in whatever room the library leaves, with the
          library docked to the bottom. In the narrower drawer everything just stacks from the top. */}
      <Flex align="center" justify="center" {...(full ? { grow: 1 } : {})} css={{ flexShrink: 0 }}>
        <Box width="100%" maxWidth={full ? 560 : 420}>
          <NowPlaying
            handle={handle}
            fallback={fallbackName(entity)}
            shuffle="title"
            {...(full ? { size: FULL_SIZE } : {})}
          />
        </Box>
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
