/** @jsxImportSource @emotion/react */
import type { EntityRef } from '@hashsome/core';
import { Flex, Typography } from 'e-prim';
import { useState, type ReactNode } from 'react';
import { fallbackName, type EntityHandle } from '../entity-handle.ts';
import { useEntityHandle } from '../hooks.ts';
import { Icon } from '../icon.tsx';
import { ConfirmDialog } from '../layout/confirm-dialog.tsx';
import { Cover } from '../layout/cover.tsx';
import { ValueBar } from '../layout/drawer-controls.tsx';
import { Skeleton } from '../layout/skeleton.tsx';
import { Spinner } from '../layout/spinner.tsx';
import { IconButton } from '../layout/tile.tsx';
import { useClient } from '../provider.tsx';
import { statusLabels } from '../status.ts';
import { usePressFeedback, useVolumeControl } from './media-controls.ts';

export interface MediaSpeakersProps {
  /** The player whose stream this is, as a ref like `ma:porch` or a handle (a custom source). */
  entity: EntityRef | EntityHandle<'mediaPlayer'>;

  /** What to call the player. Defaults to the player's own name. */
  name?: string;

  /** An allowlist of the speakers that can be added to this stream (or joined). Only those that are in it and that the player can be grouped with are offered; a speaker the player cannot be grouped with is left out, and one that is but is unavailable shows dimmed. Absent, every speaker it can be grouped with is offered. Speakers already in the stream are always shown, so they can be taken out. */
  speakers?: EntityRef[];
}

/** The speakers to offer: the ones the player can be grouped with, narrowed to an allowlist when there is one. */
export function offeredSpeakers(
  groupable: readonly EntityRef[] | undefined,
  allowed: readonly EntityRef[] | undefined,
): EntityRef[] {
  const can = groupable ?? [];
  return allowed ? can.filter((ref) => allowed.includes(ref)) : [...can];
}

/** What a row says about its player. */
interface Speaker {
  ref: EntityRef;
  name: string;
  available: boolean;

  /** The title it is playing, while it plays. */
  playing: string | undefined;

  /** The player whose stream it is in, when it is in a group. */
  leader: EntityRef | undefined;
}

/**
 * The speakers of a player's stream: who plays together with it, a volume for each, a way to take one out, to add
 * another, to join a stream that is playing in another room, and to put the stream back to just this player.
 * Everything is asked of the backend and shown when it answers. Playing something else on a speaker, or on this
 * player, to do it asks first.
 */
export function MediaSpeakers({ entity, name, speakers }: MediaSpeakersProps) {
  const handle = useEntityHandle('mediaPlayer', entity);
  const client = useClient();
  const player = handle.entity;
  const me = player?.ref;
  const { feedbackFor, press } = usePressFeedback(me);
  const [ask, setAsk] = useState<{ title: string; text: string; go: () => void } | null>(null);
  const fallback = fallbackName(entity);
  const own = name ?? player?.name ?? fallback;

  if (handle.status !== 'ready' || !player || !me) {
    return (
      <Flex direction="column" gap={2} aria-busy="true">
        {handle.status === 'ready' || handle.status === 'loading' ? (
          [0, 1, 2].map((row) => <Skeleton key={row} width="100%" height={44} radius="row" />)
        ) : (
          <Typography as="p" variant="body" color="textMuted">
            {statusLabels[handle.status]}
          </Typography>
        )}
      </Flex>
    );
  }

  if (!player.capabilities.group) {
    return (
      <Typography as="p" variant="body" color="textMuted">
        {own} cannot be grouped with other speakers.
      </Typography>
    );
  }

  const group = player.group;
  const follows = group !== undefined && group.leader !== me;
  // Where the changes to the stream go: to the player it belongs to, which is this one unless it follows.
  const head = group?.leader ?? me;
  const inStream = group ? (follows ? [group.leader, ...group.members] : group.members) : [];
  const others = inStream.filter((ref) => ref !== me);
  const candidates = offeredSpeakers(player.groupable, speakers).filter(
    (ref) => ref !== me && !others.includes(ref),
  );

  const send = (target: EntityRef, command: string, args?: Record<string, unknown>) =>
    client.command(target, command, args);

  const reset = () =>
    press('group:reset', () =>
      follows
        ? send(me, 'leaveGroup')
        : send(me, 'setGroupMembers', { remove: group?.members ?? [] }),
    );

  const addHere = (speaker: Speaker) => {
    const go = () =>
      press(`group:add:${speaker.ref}`, () =>
        send(head, 'setGroupMembers', { add: [speaker.ref] }),
      );

    if (speaker.playing === undefined) {
      go();
      return;
    }

    setAsk({
      title: `Play this on ${speaker.name}?`,
      text: `${speaker.name} is playing ${speaker.playing}. It will play this stream instead.`,
      go,
    });
  };

  const join = (speaker: Speaker) => {
    const go = () =>
      press(`group:join:${speaker.ref}`, () =>
        send(speaker.leader ?? speaker.ref, 'setGroupMembers', { add: [me] }),
      );

    if (player.playback !== 'playing') {
      go();
      return;
    }

    setAsk({
      title: `Join ${speaker.name}'s stream?`,
      text: `${own} will stop what it plays and play ${speaker.name}'s instead.`,
      go,
    });
  };

  return (
    <Flex direction="column" gap={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Typography as="h3" variant="bodyStrong">
          Speakers
        </Typography>
        {group ? (
          <ResetButton
            label={`Back to just ${own}`}
            state={feedbackFor('group:reset')}
            onClick={reset}
          />
        ) : null}
      </Flex>

      <Section title="This stream">
        <SpeakerRow speaker={me} label={own} volume handle={handle}>
          {() => null}
        </SpeakerRow>
        {others.map((ref) => (
          <SpeakerRow
            key={ref}
            speaker={ref}
            volume
            note={ref === group?.leader ? 'Leading' : undefined}
          >
            {(speaker) =>
              ref === group?.leader ? null : (
                <IconButton
                  icon="lu:x"
                  label={`Take ${speaker.name} out of this stream`}
                  glyph={16}
                  feedback={feedbackFor(`group:remove:${ref}`)}
                  onClick={() =>
                    press(`group:remove:${ref}`, () =>
                      send(head, 'setGroupMembers', { remove: [ref] }),
                    )
                  }
                />
              )
            }
          </SpeakerRow>
        ))}
      </Section>

      <Section title="Other speakers">
        {candidates.length === 0 ? (
          <Typography as="p" variant="body" color="textMuted">
            No other speakers to add.
          </Typography>
        ) : (
          candidates.map((ref) => (
            <SpeakerRow key={ref} speaker={ref}>
              {(speaker) => (
                <>
                  {speaker.playing !== undefined || speaker.leader !== undefined ? (
                    <IconButton
                      icon="lu:log-in"
                      label={`Join ${speaker.name}'s stream`}
                      glyph={16}
                      disabled={!speaker.available}
                      feedback={feedbackFor(`group:join:${ref}`)}
                      onClick={() => join(speaker)}
                    />
                  ) : null}
                  <IconButton
                    icon="lu:plus"
                    label={`Add ${speaker.name} to this stream`}
                    glyph={16}
                    disabled={!speaker.available}
                    feedback={feedbackFor(`group:add:${ref}`)}
                    onClick={() => addHere(speaker)}
                  />
                </>
              )}
            </SpeakerRow>
          ))
        )}
      </Section>

      <ConfirmDialog
        open={ask !== null}
        title={ask?.title ?? ''}
        description={ask?.text}
        confirmLabel="Go ahead"
        onConfirm={() => {
          ask?.go();
          setAsk(null);
        }}
        onCancel={() => setAsk(null)}
      />
    </Flex>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex direction="column" gap={1}>
      <Typography as="h4" variant="eyebrow" uppercase color="textMuted">
        {title}
      </Typography>
      {children}
    </Flex>
  );
}

/** One speaker: its picture, name and what it is doing, optionally a volume bar, and whatever its actions are. */
function SpeakerRow({
  speaker,
  label,
  volume = false,
  note,
  handle: given,
  children,
}: {
  speaker: EntityRef;

  /** A name to use in place of the player's own. */
  label?: string;

  /** Shows a volume bar for it. */
  volume?: boolean;

  /** A line instead of what it is doing. */
  note?: string | undefined;

  /** Its handle, when the caller has one. */
  handle?: EntityHandle<'mediaPlayer'>;
  children: (speaker: Speaker) => ReactNode;
}) {
  const own = useEntityHandle('mediaPlayer', given ?? speaker);
  const player = own.entity;
  const level = useVolumeControl(own);
  const available = own.status === 'ready';
  const title = player?.media?.title;
  const info: Speaker = {
    ref: speaker,
    name: label ?? player?.name ?? fallbackName(speaker),
    available,
    playing: available && player?.playback === 'playing' ? (title ?? 'something') : undefined,
    leader: player?.group?.leader === speaker ? undefined : player?.group?.leader,
  };

  const status = !available
    ? statusLabels[own.status as Exclude<typeof own.status, 'ready'>]
    : (note ??
      (info.playing !== undefined
        ? `Playing ${info.playing}`
        : player?.playback === 'paused'
          ? 'Paused'
          : 'Idle'));

  return (
    <Flex align="center" gap={3} py={1.5} css={{ opacity: available ? 1 : 0.55 }}>
      <Flex
        align="center"
        justify="center"
        background="surfaceRaised"
        color="textMuted"
        radius="small"
        width={40}
        height={40}
        overflow="hidden"
        css={{ flex: 'none' }}
      >
        {player?.media?.artworkUrl && info.playing !== undefined ? (
          <Cover src={player.media.artworkUrl} />
        ) : (
          <Icon name="lu:speaker" size={18} />
        )}
      </Flex>
      <Flex direction="column" grow={1} minWidth={0}>
        <Typography as="span" variant="bodyStrong" noWrap textOverflow="ellipsis" overflow="hidden">
          {info.name}
        </Typography>
        <Typography
          as="span"
          variant="secondary"
          color="textMuted"
          noWrap
          textOverflow="ellipsis"
          overflow="hidden"
        >
          {status}
        </Typography>
      </Flex>
      {volume && available && player?.capabilities.volume ? (
        <Flex width={140} css={{ flex: 'none' }}>
          <ValueBar
            label={`${info.name} volume`}
            value={level.shown}
            min={0}
            max={100}
            keyStep={5}
            height={10}
            onDrag={level.drag}
            onCommit={level.commit}
          />
        </Flex>
      ) : null}
      <Flex align="center" gap={2} css={{ flex: 'none' }}>
        {children(info)}
      </Flex>
    </Flex>
  );
}

/** The text button that puts the stream back to just this player. */
function ResetButton({
  label,
  state,
  onClick,
}: {
  label: string;
  state: 'pending' | 'error' | undefined;
  onClick: () => void;
}) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      disabled={state === 'pending'}
      align="center"
      gap={2}
      radius="full"
      height={32}
      px={3.5}
      background="surfaceRaised"
      color={state === 'error' ? 'danger' : 'text'}
      cursor={state === 'pending' ? 'progress' : 'pointer'}
    >
      {state === 'pending' ? <Spinner size={14} /> : <Icon name="lu:undo-2" size={14} />}
      <Typography as="span" variant="label">
        {label}
      </Typography>
    </Flex>
  );
}
