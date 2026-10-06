/** @jsxImportSource @emotion/react */
import type { EntityRef, QueueItem } from '@hashsome/core';
import { Flex, Typography } from 'e-prim';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useEntityHandle } from '../hooks.ts';
import { Icon } from '../icon.tsx';
import { Cover } from '../layout/cover.tsx';
import { MarqueeText } from '../layout/marquee-text.tsx';
import { PlainButton } from '../layout/plain-button.tsx';
import { useMediaQueue } from '../use-media-queue.ts';
import { formatDuration } from './media-progress.ts';

export interface MediaQueueProps {
  /** The media player, as a ref like `ma:living_room`. Shows nothing for a player with no queue. */
  entity: EntityRef;
}

/** The height of a track's row: a touch target, with room for its picture. */
const ROW = 56;

/**
 * A player's queue: the tracks that have just played (dimmed), the one playing, and what comes next,
 * as a list that scrolls. Tap a track to jump to it, the cross takes it out, and Clear takes out everything
 * after the track that is playing, which carries on. It is made to sit beside the player in a wide space (see `MediaPlayerFull`'s `queue`).
 */
export function MediaQueue({ entity }: MediaQueueProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const { queue, refresh } = useMediaQueue(entity);
  // Clearing a long queue takes a moment: the button waits, and what is being taken out is dimmed meanwhile.
  const [clearing, setClearing] = useState(false);
  const still = useReducedMotion();
  if (!queue || handle.entity?.capabilities.queue !== true) {
    return null;
  }

  // After a change the queue is read again, once the player has had a moment to apply it.
  const run = (command: 'playQueueItem' | 'removeQueueItem' | 'clearQueue', item?: QueueItem) => {
    const sent =
      command === 'clearQueue'
        ? handle.command('clearQueue')
        : handle.command(command, { item: item!.id });

    if (command === 'clearQueue') {
      setClearing(true);
    }

    void sent
      .then(() => setTimeout(refresh, 400))
      .catch(() => undefined)
      .finally(() => setClearing(false));
  };

  const hidden = Math.max(0, queue.total - queue.offset - queue.items.length);
  return (
    <Flex direction="column" minHeight={0} grow={1} gap={2}>
      <Flex align="center" justify="space-between" gap={2}>
        <Typography as="h2" variant="heading" m={0}>
          Queue
          <Typography as="span" variant="secondary" color="textMuted">
            {' '}
            · {queue.total} {queue.total === 1 ? 'track' : 'tracks'}
          </Typography>
        </Typography>
        {queue.total > 0 ? (
          <PlainButton
            aria-label="Clear the queue"
            title="Clear what comes next; the track playing carries on"
            disabled={clearing}
            onClick={() => run('clearQueue')}
            align="center"
            gap={1}
            px={2.5}
            height={32}
            radius="full"
            color="textMuted"
            css={({ palette }) => ({ '&:hover': { background: palette.surfaceRaised } })}
          >
            <Icon name="lu:trash" size={14} />
            <Typography as="span" variant="label" color="textMuted">
              Clear
            </Typography>
          </PlainButton>
        ) : null}
      </Flex>

      {queue.items.length === 0 ? (
        <Typography as="p" variant="body" color="textMuted">
          Nothing is queued. Play or add something from the library.
        </Typography>
      ) : (
        <Flex
          as="ul"
          direction="column"
          gap={0.5}
          m={0}
          p={0}
          minHeight={0}
          css={{ listStyle: 'none', overflowY: 'auto' }}
        >
          {/* A track that arrives grows in, one that leaves closes up, and the rest slide to fill the
              space, so removing one, jumping to one or clearing the queue is something to watch rather
              than a list that changes in one frame. The ones there from the start do not animate. */}
          <AnimatePresence initial={false}>
            {queue.items.map((item, index) => {
              const played = !item.current && index < queue.items.findIndex((x) => x.current);
              // While Clear works only what is on its way out is dimmed: the track that plays and
              // the ones before it stay as they are.
              const leaving = clearing && !item.current && !played;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: played || leaving ? 0.5 : 1, height: ROW }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: still ? 0 : 0.2, ease: 'easeOut' }}
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flex: 'none',
                    overflow: 'hidden',
                  }}
                >
                  <PlainButton
                    align="center"
                    gap={3}
                    grow={1}
                    minWidth={0}
                    height={ROW}
                    px={2}
                    radius="row"
                    aria-label={`${item.current ? 'Playing' : 'Play'} ${item.title}`}
                    aria-current={item.current ? 'true' : undefined}
                    background={item.current ? 'surfaceRaised' : 'transparent'}
                    onClick={() => run('playQueueItem', item)}
                    css={({ palette }) => ({
                      transition: 'background-color 160ms ease',
                      '&:hover': { background: palette.surfaceRaised },
                    })}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      background="surfaceRaised"
                      color={item.current ? 'accent' : 'textMuted'}
                      radius="small"
                      width={40}
                      height={40}
                      overflow="hidden"
                      css={{ flex: 'none' }}
                    >
                      {item.artworkUrl ? (
                        <Cover src={item.artworkUrl} />
                      ) : (
                        <Icon name={item.current ? 'lu:audio-lines' : 'lu:music'} size={18} />
                      )}
                    </Flex>
                    <Flex direction="column" minWidth={0} grow={1} align="flex-start">
                      <Typography
                        as="span"
                        variant="bodyStrong"
                        color={item.current ? 'accent' : 'text'}
                        maxWidth="100%"
                      >
                        <MarqueeText>{item.title}</MarqueeText>
                      </Typography>
                      {item.artist ? (
                        <Typography as="span" variant="secondary" color="textMuted" maxWidth="100%">
                          <MarqueeText>{item.artist}</MarqueeText>
                        </Typography>
                      ) : null}
                    </Flex>
                    {item.duration !== undefined ? (
                      <Typography as="span" variant="secondary" color="textMuted">
                        {formatDuration(item.duration)}
                      </Typography>
                    ) : null}
                  </PlainButton>
                  {item.current ? (
                    <Flex width={ROW / 2} css={{ flex: 'none' }} />
                  ) : (
                    <PlainButton
                      aria-label={`Remove ${item.title} from the queue`}
                      title="Remove from the queue"
                      onClick={() => run('removeQueueItem', item)}
                      center
                      width={ROW / 2}
                      height={ROW / 2}
                      radius="full"
                      color="textMuted"
                      css={({ palette }) => ({
                        flex: 'none',
                        '&:hover': { background: palette.surfaceRaised },
                      })}
                    >
                      <Icon name="lu:x" size={16} />
                    </PlainButton>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
          {hidden > 0 ? (
            <Typography as="li" variant="secondary" color="textMuted" py={2} css={{ flex: 'none' }}>
              and {hidden.toLocaleString()} more
            </Typography>
          ) : null}
        </Flex>
      )}
    </Flex>
  );
}
