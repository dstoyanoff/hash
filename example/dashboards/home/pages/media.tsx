import { MediaBrowser, MediaPlayerFull } from '@hashsome/ui';
import { Flex } from 'e-prim';

// The page is the dashboard's own: a surface that fills the space and scrolls inside it, around the
// player and its library. `MediaPlayerFull` only draws the player; change the rest as you like.
export default function Media() {
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
      <MediaPlayerFull
        entity="ma:living_room"
        wide
        browser={<MediaBrowser entity="ma:living_room" layout="theater" />}
      />
    </Flex>
  );
}
