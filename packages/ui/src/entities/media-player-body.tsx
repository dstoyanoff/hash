/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hash/core';
import { Box, Flex } from 'e-prim';
import type { ReactNode } from 'react';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { useDetail } from '../layout/detail-provider.tsx';
import { NowPlaying } from './now-playing.tsx';

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
    <Flex direction="column" gap={5}>
      <Box width="100%" maxWidth={420} mx="auto">
        <NowPlaying handle={handle} fallback={fallbackName(entity)} />
      </Box>
      {browser !== undefined ? (
        <>
          <Box height={1} background="border" />
          {/* A list is capped so a row is never a long way from its play button on a very wide
              screen; the theater row uses the whole width. */}
          <Box width="100%" {...(full ? {} : { maxWidth: 960, mx: 'auto' })}>
            {browser}
          </Box>
        </>
      ) : null}
    </Flex>
  );
}
