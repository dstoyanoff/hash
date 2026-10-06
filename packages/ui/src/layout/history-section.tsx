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

/** The round picture at the start of a row: initials for a person, a robot for an automation, and
 * for nobody a quiet chip, so every row's text lines up: a switch for a change of state (often someone
 * at the device's own switch), a chip for the device coming or going. */
function Avatar({
  actor,
  kind,
  change,
}: {
  actor: string | undefined;
  kind: 'person' | 'automation';
  change: LogbookEntry['change'];
}) {
  const person = actor !== undefined && kind === 'person';
  return (
    <Flex
      role="img"
      aria-label={actor ?? 'System'}
      align="center"
      justify="center"
      background={person ? 'accent' : 'surfaceRaised'}
      color={person ? 'accentText' : actor === undefined ? 'textMuted' : 'text'}
      radius="full"
      width={32}
      height={32}
      css={{ flex: 'none' }}
    >
      {person ? (
        <Typography as="span" variant="eyebrow">
          {initials(actor)}
        </Typography>
      ) : (
        <Icon
          name={actor !== undefined ? 'lu:bot' : change === 'state' ? 'lu:toggle-right' : 'lu:cpu'}
          size={16}
        />
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
            <Avatar actor={entry.actor} kind={entry.actorKind ?? 'person'} change={entry.change} />
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
