import type { EntityRef } from '@hash/core';
import {
  mdiMusic,
  mdiPause,
  mdiPlay,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiVolumeHigh,
  mdiVolumeOff,
} from '@mdi/js';
import { useState } from 'react';
import { Icon } from '../icon.tsx';
import { usePlayer } from '../use-player.ts';
import { IconButton } from '../layout/tile.tsx';
import { statusLabels } from '../status.ts';

export interface MediaPlayerBarProps {
  /** A `media_player.*` entity, e.g. `ha:media_player.living_room`. */
  entity: EntityRef;
}

export function MediaPlayerBar({ entity }: MediaPlayerBarProps) {
  const player = usePlayer(entity);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const ready = player.status === 'ready';
  const playing = player.state === 'playing';

  return (
    <div className="hash-media" data-status={player.status}>
      {player.artworkUrl ? (
        <img className="hash-media__art" src={player.artworkUrl} alt="" />
      ) : (
        <span className="hash-media__art">
          <Icon path={mdiMusic} />
        </span>
      )}
      <div className="hash-media__text">
        <span className="hash-tile__label">
          {ready
            ? (player.title ?? 'Nothing playing')
            : statusLabels[player.status as Exclude<typeof player.status, 'ready'>]}
        </span>
        {ready && player.artist ? (
          <span className="hash-tile__secondary">{player.artist}</span>
        ) : null}
      </div>
      <IconButton
        path={mdiSkipPrevious}
        label="Previous"
        disabled={!ready}
        onClick={() => void player.previous()}
      />
      <IconButton
        path={mdiSkipNext}
        label="Next"
        disabled={!ready}
        onClick={() => void player.next()}
      />
      <IconButton
        path={player.muted ? mdiVolumeOff : mdiVolumeHigh}
        label="Volume"
        disabled={!ready}
        active={volumeOpen}
        onClick={() => setVolumeOpen((open) => !open)}
      />
      <IconButton
        path={playing ? mdiPause : mdiPlay}
        label={playing ? 'Pause' : 'Play'}
        disabled={!ready}
        primary
        onClick={() => void player.togglePlay()}
      />
      {volumeOpen && ready ? (
        <div className="hash-popover">
          <IconButton
            path={player.muted ? mdiVolumeOff : mdiVolumeHigh}
            label={player.muted ? 'Unmute' : 'Mute'}
            onClick={() => void player.toggleMute()}
          />
          <input
            className="hash-range"
            type="range"
            min={0}
            max={100}
            aria-label="Volume level"
            defaultValue={Math.round((player.volume ?? 0) * 100)}
            onChange={(event) => void player.setVolume(Number(event.target.value) / 100)}
          />
        </div>
      ) : null}
    </div>
  );
}
