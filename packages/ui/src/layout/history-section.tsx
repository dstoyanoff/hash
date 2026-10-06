/** @jsxImportSource @emotion/react */
import type { LogbookEntry } from '@hashsome/core';
import { Flex, Typography } from 'e-prim';
import { Icon } from '../icon.tsx';
import { capitalize } from '../status.ts';

export type { LogbookEntry };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) {
    return 'Just now';
  }

  if (diff < HOUR) {
    return `${Math.round(diff / MINUTE)}m ago`;
  }

  if (diff < DAY) {
    return `${Math.round(diff / HOUR)}h ago`;
  }

  return `${Math.round(diff / DAY)}d ago`;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function Avatar({ actor, kind }: { actor: string; kind: 'person' | 'automation' }) {
  const automation = kind === 'automation';
  return (
    <Flex
      align="center"
      justify="center"
      background={automation ? 'surfaceRaised' : 'accent'}
      color={automation ? 'text' : 'accentText'}
      radius="full"
      width={32}
      height={32}
      css={{ flex: 'none' }}
    >
      {automation ? (
        <Icon name="lu:bot" size={16} />
      ) : (
        <Typography as="span" variant="eyebrow">
          {initials(actor)}
        </Typography>
      )}
    </Flex>
  );
}

export interface HistorySectionProps {
  /** Recent activity, newest first. An empty list renders nothing. */
  entries: LogbookEntry[];
}

/** A short activity list for an entity's detail drawer. Generic — any entity type can supply it. */
export function HistorySection({ entries }: HistorySectionProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Flex direction="column" gap={4} pt={4} mt="auto">
      <Typography as="span" variant="eyebrow" uppercase color="textMuted">
        History
      </Typography>
      <Flex direction="column">
        {entries.map((entry) => (
          <Flex key={entry.id} align="center" gap={3} py={2}>
            {entry.actor ? <Avatar actor={entry.actor} kind={entry.actorKind ?? 'person'} /> : null}
            <Flex direction="column" minWidth={0}>
              <Typography as="span" variant="body" noWrap textOverflow="ellipsis" minWidth={0}>
                {entry.actor ? (
                  <Typography as="span" variant="bodyStrong">
                    {entry.actor}{' '}
                  </Typography>
                ) : null}
                {entry.actor ? entry.message : capitalize(entry.message)}
              </Typography>
              <Typography as="span" variant="secondary" color="textMuted">
                {relativeTime(entry.timestamp)}
              </Typography>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
