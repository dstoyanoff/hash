/** @jsxImportSource @emotion/react */
import type { BrowseItem, BrowseKind, EntityRef } from '@hash/core';
import { Box, Flex, Typography } from 'e-prim';
import type { IconName } from '../icon-data.ts';
import { Icon } from '../icon.tsx';
import { useEntityHandle } from '../hooks.ts';
import { useDetail } from '../layout/detail-provider.tsx';
import { Cover } from '../layout/cover.tsx';
import { ChipRow } from '../layout/drawer-controls.tsx';
import { PlainButton } from '../layout/plain-button.tsx';
import { IconButton } from '../layout/tile.tsx';
import { useMediaBrowser } from '../use-media-browser.ts';

export interface MediaBrowserProps {
  /** The media player whose own library to browse, as a ref like `ma:living_room`. The backend that owns the player is the media source, so a Music Assistant player lists Music Assistant's library and a Home Assistant player Home Assistant's. */
  entity: EntityRef;

  /** Called after something is started, e.g. to close a drawer the browser sits in. */
  onPlay?: (item: BrowseItem) => void;

  /** How items are laid out. `list` is rows, compact enough for a narrow drawer. `theater` is a single row of large cards that scrolls sideways, for a wide space. `auto` is `theater` inside an expanded drawer and `list` anywhere else. Default `list`. */
  layout?: 'list' | 'theater' | 'auto';
}

const KIND_ICONS: Record<BrowseKind, IconName> = {
  folder: 'lu:folder',
  artist: 'lu:mic-vocal',
  album: 'lu:disc-3',
  playlist: 'lu:list-music',
  track: 'lu:music',
  radio: 'lu:radio',
  other: 'lu:music',
};

/** The library of a media player, in the app's own style: shelves, albums, playlists and the rest
 * as rows with artwork. Tap a folder to open it, a track or station to play it, or the play button
 * on an album, playlist or artist to play all of it. A search box appears when the library can be
 * searched. */
export function MediaBrowser({ entity, onPlay, layout = 'list' }: MediaBrowserProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const { detail } = useDetail();
  const theater = layout === 'theater' || (layout === 'auto' && detail?.expanded === true);
  const browser = useMediaBrowser(entity);
  const player = handle.entity;
  const play = (item: BrowseItem) => {
    void handle.command('playMedia', { item: item.id });
    onPlay?.(item);
  };

  /** Something is open inside the selected shelf (not a search): the tab shows the way back. */
  const inside = browser.canGoBack && !browser.searching;
  const header = (
    <Flex align="center" gap={2}>
      {browser.canGoBack ? (
        <IconButton icon="lu:arrow-left" label="Back" glyph={16} onClick={browser.back} />
      ) : null}
      <Typography as="h2" variant="heading" grow={1} m={0}>
        {browser.title ?? 'Library'}
      </Typography>
    </Flex>
  );

  const search = player?.capabilities.search ? (
    <Flex
      align="center"
      gap={2}
      background="surfaceRaised"
      radius="full"
      px={3}
      height={36}
      color="textMuted"
    >
      <Icon name="lu:search" size={16} />
      <Box
        as="input"
        type="search"
        aria-label="Search the library"
        placeholder="Search"
        typography="body"
        color="text"
        grow={1}
        minWidth={0}
        value={browser.query}
        onChange={(event: { target: { value: string } }) => browser.search(event.target.value)}
        css={{ background: 'none', outline: 'none' }}
      />
      {browser.query !== '' ? (
        <PlainButton
          aria-label="Clear search"
          title="Clear search"
          onClick={() => browser.search('')}
          center
          css={{ flex: 'none' }}
        >
          <Icon name="lu:x" size={16} />
        </PlainButton>
      ) : null}
    </Flex>
  ) : null;

  return (
    <Flex direction="column" gap={3} minHeight={0}>
      {/* With shelves, search and tabs are a fixed frame and only what is below them changes; a
          list has no frame, so its heading row, always there, comes first. */}
      {browser.tabs === undefined ? header : null}
      {search}
      {browser.tabs ? (
        <ChipRow
          tabs
          options={browser.tabs.map((item) =>
            // Inside a shelf the selected tab becomes the way back, so nothing is added to the
            // layout and nothing below it moves.
            item.id === browser.activeTab && inside
              ? {
                  value: item.id,
                  label: browser.title ?? item.title,
                  icon: 'lu:arrow-left' as const,
                  ariaLabel: 'Back',
                }
              : { value: item.id, label: item.title },
          )}
          value={browser.activeTab}
          onChange={(id) =>
            id === browser.activeTab && inside ? browser.back() : browser.selectTab(id)
          }
        />
      ) : null}
      {browser.error ? (
        <Typography as="p" variant="body" color="danger" role="alert">
          {browser.error}
        </Typography>
      ) : browser.loading ? (
        <Typography as="p" variant="body" color="textMuted">
          Loading…
        </Typography>
      ) : browser.items.length === 0 ? (
        <Typography as="p" variant="body" color="textMuted">
          {browser.searching ? 'Nothing found.' : 'Nothing here.'}
        </Typography>
      ) : theater ? (
        // One row of large cards that scrolls sideways, with a thin quiet scrollbar.
        <Flex
          as="ul"
          gap={4}
          m={0}
          p={0}
          pb={2}
          css={({ palette }) => ({
            listStyle: 'none',
            overflowX: 'auto',
            scrollSnapType: 'x proximity',
            scrollbarWidth: 'thin',
            scrollbarColor: `${palette.border} transparent`,
          })}
        >
          {browser.items.map((item) => (
            <li key={item.id} css={{ flex: 'none', scrollSnapAlign: 'start' }}>
              <BrowseCard item={item} onOpen={() => browser.open(item)} onPlay={() => play(item)} />
            </li>
          ))}
        </Flex>
      ) : (
        <Flex direction="column" gap={1} as="ul" m={0} p={0} css={{ listStyle: 'none' }}>
          {browser.items.map((item) => (
            <li key={item.id}>
              <BrowseRow item={item} onOpen={() => browser.open(item)} onPlay={() => play(item)} />
            </li>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

function BrowseRow({
  item,
  onOpen,
  onPlay,
}: {
  item: BrowseItem;
  onOpen: () => void;
  onPlay: () => void;
}) {
  // A row opens what can be opened and otherwise plays; an openable thing that can also be played
  // (an album) gets its own play button.
  const main = item.expandable ? onOpen : item.playable ? onPlay : undefined;
  return (
    <Flex align="center" gap={2}>
      <PlainButton
        align="center"
        gap={3}
        grow={1}
        minWidth={0}
        radius="row"
        py={1.5}
        px={2}
        cursor={main ? 'pointer' : 'default'}
        disabled={!main}
        aria-label={item.expandable ? `Open ${item.title}` : `Play ${item.title}`}
        onClick={main}
        css={({ palette }) => ({ '&:hover:not(:disabled)': { background: palette.surfaceRaised } })}
      >
        <Flex
          align="center"
          justify="center"
          background="surfaceRaised"
          color="textMuted"
          radius="small"
          width={44}
          height={44}
          overflow="hidden"
          css={{ flex: 'none' }}
        >
          {item.artworkUrl ? (
            <Cover src={item.artworkUrl} />
          ) : (
            <Icon name={KIND_ICONS[item.kind]} size={20} />
          )}
        </Flex>
        <Flex direction="column" minWidth={0}>
          <Typography as="span" variant="bodyStrong" noWrap textOverflow="ellipsis">
            {item.title}
          </Typography>
          {item.subtitle ? (
            <Typography
              as="span"
              variant="secondary"
              color="textMuted"
              noWrap
              textOverflow="ellipsis"
            >
              {item.subtitle}
            </Typography>
          ) : null}
        </Flex>
      </PlainButton>
      {item.expandable && item.playable ? (
        <IconButton icon="lu:play" label={`Play ${item.title}`} glyph={16} onClick={onPlay} />
      ) : null}
    </Flex>
  );
}

/** The width and height of a theater card's artwork. */
const CARD = 200;

/** An item as a large card for the theater layout: big artwork (round for an artist), then the
 * title and subtitle. It opens or plays like a row does, and an album or playlist gets its play
 * button over the artwork's corner. */
function BrowseCard({
  item,
  onOpen,
  onPlay,
}: {
  item: BrowseItem;
  onOpen: () => void;
  onPlay: () => void;
}) {
  const main = item.expandable ? onOpen : item.playable ? onPlay : undefined;
  return (
    <Box position="relative" width={CARD}>
      <PlainButton
        direction="column"
        gap={2}
        width="100%"
        cursor={main ? 'pointer' : 'default'}
        disabled={!main}
        aria-label={item.expandable ? `Open ${item.title}` : `Play ${item.title}`}
        onClick={main}
      >
        <Flex
          align="center"
          justify="center"
          background="surfaceRaised"
          color="textMuted"
          radius={item.kind === 'artist' ? 'full' : 'card'}
          overflow="hidden"
          width={CARD}
          height={CARD}
        >
          {item.artworkUrl ? (
            <Cover src={item.artworkUrl} />
          ) : (
            <Icon name={KIND_ICONS[item.kind]} size={56} />
          )}
        </Flex>
        <Flex direction="column" minWidth={0} px={1}>
          <Typography as="span" variant="bodyStrong" noWrap textOverflow="ellipsis">
            {item.title}
          </Typography>
          {item.subtitle ? (
            <Typography
              as="span"
              variant="secondary"
              color="textMuted"
              noWrap
              textOverflow="ellipsis"
            >
              {item.subtitle}
            </Typography>
          ) : null}
        </Flex>
      </PlainButton>
      {item.expandable && item.playable ? (
        // Over the artwork's lower right corner.
        <Box position="absolute" css={{ right: 10, top: CARD - 54 }}>
          <IconButton icon="lu:play" label={`Play ${item.title}`} glyph={16} onClick={onPlay} />
        </Box>
      ) : null}
    </Box>
  );
}
