import { MediaBrowser, MediaPlayerFull, MediaQueue } from '@hashsome/ui';
import { Flex } from 'e-prim';

// The page is the dashboard's own: a surface that fills the space and scrolls inside it, around the
// player, its queue (beside it) and its library. `MediaPlayerFull` only lays them out; change the
// rest as you like.
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
        queue={<MediaQueue entity="ma:living_room" />}
        browser={<MediaBrowser entity="ma:living_room" layout="theater" />}
      />
    </Flex>
  );
}
