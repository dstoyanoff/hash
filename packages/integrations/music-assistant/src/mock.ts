import { MockIntegration, mockLibrary, type EntityInput } from '@hashsome/core';
import { toMediaPlayer, type MaPlayer } from './mapper.ts';

export interface MusicAssistantMockOptions {
  /** Integration id. Defaults to `ma`. */
  id?: string;

  /** Extra entities, by local id; they replace a default with the same id. */
  entities?: Record<string, EntityInput>;
}

/** What Music Assistant reports for a few players: one per state a dashboard has to handle. Raw
 * players, so the mock is built by the same mapping the real integration uses. */
const players = (): MaPlayer[] => [
  {
    player_id: 'living_room',
    display_name: 'Living room',
    available: true,
    playback_state: 'playing',
    volume_level: 40,
    volume_muted: false,
    current_media: {
      title: 'Blank Space',
      artist: 'More More',
      album: '1989',
      duration: 231,
      image_url: 'https://picsum.photos/seed/aurora/400',
    },
    elapsed_time: 64,
    elapsed_time_last_updated: Date.now() / 1000,
  },
  {
    player_id: 'kitchen',
    display_name: 'Kitchen',
    available: true,
    playback_state: 'paused',
    volume_level: 25,
    volume_muted: true,
    current_media: {
      title: 'Dreams',
      artist: 'Fleetwood Mac',
      duration: 214,
      image_url: 'https://picsum.photos/seed/dreams/400',
    },
    shuffle_enabled: true,
    elapsed_time: 95,
    elapsed_time_last_updated: Date.now() / 1000,
  },
  {
    player_id: 'office',
    display_name: 'Office',
    available: true,
    playback_state: 'idle',
    volume_level: 15,
    volume_muted: false,
  },
  {
    player_id: 'garage',
    display_name: 'Garage',
    available: false,
  },
];

/** A Music Assistant integration that needs no Music Assistant: representative players, mapped the
 * same way real ones are, and commands that change their state. For tests, the gallery and
 * dashboards under development. */
export function createMock(options: MusicAssistantMockOptions = {}): MockIntegration {
  const entities: Record<string, EntityInput> = {};
  for (const player of players()) {
    entities[player.player_id] = toMediaPlayer(player);
  }

  return new MockIntegration({
    id: options.id ?? 'ma',
    library: mockLibrary(),
    entities: { ...entities, ...options.entities },
  });
}
