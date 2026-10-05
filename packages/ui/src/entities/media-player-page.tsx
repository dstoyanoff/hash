/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hash/core';
import { Flex } from 'e-prim';
import { useEntityHandle } from '../hooks.ts';
import { MediaBrowser } from './media-browser.tsx';
import { MediaPlayerBody } from './media-player-body.tsx';

export interface MediaPlayerPageProps {
  /** A media player, as a ref like `ma:living_room`. A ref, not a handle: the library below the player is read through the runtime. */
  entity: EntityRef;

  /** What to call the player: the drawer's title and the name shown when nothing is playing. Defaults to the player's own name. */
  name?: string;
}

/** The player as a whole page: the player centered, and the player's library below it, so songs
 * are picked right here instead of in a drawer. It is the same layout as the expanded drawer. It
 * fills the height it is given and scrolls inside it. */
export function MediaPlayerPage({ entity, name }: MediaPlayerPageProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const browsable = handle.entity?.capabilities.browse === true;

  return (
    <Flex
      direction="column"
      background="surface"
      radius="card"
      p={5}
      grow={1}
      minHeight={0}
      overflow="auto"
    >
      <MediaPlayerBody
        entity={entity}
        wide
        {...(name !== undefined ? { name } : {})}
        {...(browsable ? { browser: <MediaBrowser entity={entity} layout="theater" /> } : {})}
      />
    </Flex>
  );
}
