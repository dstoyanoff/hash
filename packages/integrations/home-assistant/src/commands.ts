import { decodeItemId } from './browse.ts';
import type { ClimateMode, Entity } from '@hash/core';
import { domainOf } from './mappers/common.ts';
import { MODE_TO_HVAC } from './mappers/climate.ts';

export interface ServiceRequest {
  domain: string;
  service: string;
  data?: Record<string, unknown>;
}

function number(args: Record<string, unknown> | undefined, key: string): number {
  const value = args?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`"${key}" must be a number`);
  }

  return value;
}

const mediaPlayerService = (service: string, data?: Record<string, unknown>): ServiceRequest => ({
  domain: 'media_player',
  service,
  ...(data ? { data } : {}),
});

/** Translates a model command on `entity` into the Home Assistant service call that performs it. */
export function toServiceRequest(
  entityId: string,
  entity: Entity,
  name: string,
  args: Record<string, unknown> | undefined,
): ServiceRequest {
  const domain = domainOf(entityId);
  const unsupported = () => new Error(`A ${entity.kind} has no "${name}" command`);

  switch (entity.kind) {
    case 'mediaPlayer': {
      switch (name) {
        case 'play':
          return mediaPlayerService('media_play');
        case 'pause':
          return mediaPlayerService('media_pause');
        case 'togglePlay':
          return mediaPlayerService('media_play_pause');
        case 'next':
          return mediaPlayerService('media_next_track');
        case 'previous':
          return mediaPlayerService('media_previous_track');
        case 'setVolume':
          return mediaPlayerService('volume_set', {
            volume_level: Math.min(1, Math.max(0, number(args, 'volume'))),
          });
        case 'setMuted':
          if (typeof args?.muted !== 'boolean') {
            throw new Error('"muted" must be a boolean');
          }

          return mediaPlayerService('volume_mute', { is_volume_muted: args.muted });
        case 'setShuffle':
          if (typeof args?.shuffle !== 'boolean') {
            throw new Error('"shuffle" must be a boolean');
          }

          return mediaPlayerService('shuffle_set', { shuffle: args.shuffle });
        case 'seek':
          return mediaPlayerService('media_seek', {
            seek_position: Math.max(0, number(args, 'position')),
          });
        case 'playMedia': {
          if (typeof args?.item !== 'string') {
            throw new Error('"item" must be a media item id');
          }

          const mode = args.mode;
          if (mode !== undefined && !['play', 'replace', 'next', 'add'].includes(String(mode))) {
            throw new Error('"mode" must be play, replace, next or add');
          }

          const { contentType, contentId } = decodeItemId(args.item);
          return mediaPlayerService('play_media', {
            media_content_type: contentType,
            media_content_id: contentId,
            ...(mode ? { enqueue: mode } : {}),
          });
        }

        default:
          throw unsupported();
      }
    }

    case 'light':
      switch (name) {
        case 'turnOn':
          return { domain: 'light', service: 'turn_on' };
        case 'turnOff':
          return { domain: 'light', service: 'turn_off' };
        case 'toggle':
          return { domain: 'light', service: 'toggle' };
        case 'setBrightness': {
          const brightness = Math.min(1, Math.max(0, number(args, 'brightness')));
          return brightness === 0
            ? { domain: 'light', service: 'turn_off' }
            : {
                domain: 'light',
                service: 'turn_on',
                data: { brightness_pct: Math.max(1, Math.round(brightness * 100)) },
              };
        }

        case 'setColorTemperature':
          return {
            domain: 'light',
            service: 'turn_on',
            data: { color_temp_kelvin: Math.round(number(args, 'kelvin')) },
          };
        case 'setColor':
          return {
            domain: 'light',
            service: 'turn_on',
            data: { hs_color: [number(args, 'hue'), number(args, 'saturation')] },
          };
        default:
          throw unsupported();
      }

    case 'climate':
      switch (name) {
        case 'setMode': {
          const mode = MODE_TO_HVAC[args?.mode as ClimateMode];
          if (!mode) {
            throw new Error('"mode" is not a climate mode');
          }

          return { domain: 'climate', service: 'set_hvac_mode', data: { hvac_mode: mode } };
        }

        case 'setTargetTemperature':
          return {
            domain: 'climate',
            service: 'set_temperature',
            data: { temperature: number(args, 'temperature') },
          };
        case 'setPreset':
          if (typeof args?.preset !== 'string') {
            throw new Error('"preset" must be a string');
          }

          return {
            domain: 'climate',
            service: 'set_preset_mode',
            data: { preset_mode: args.preset },
          };
        default:
          throw unsupported();
      }

    case 'switch': {
      if (domain === 'lock') {
        const service =
          name === 'turnOn'
            ? 'lock'
            : name === 'turnOff'
              ? 'unlock'
              : name === 'toggle'
                ? entity.on
                  ? 'unlock'
                  : 'lock'
                : undefined;

        if (!service) {
          throw unsupported();
        }

        return { domain: 'lock', service };
      }

      const service =
        name === 'turnOn'
          ? 'turn_on'
          : name === 'turnOff'
            ? 'turn_off'
            : name === 'toggle'
              ? 'toggle'
              : undefined;

      if (!service) {
        throw unsupported();
      }

      return { domain, service };
    }

    case 'action': {
      if (name !== 'trigger') {
        throw unsupported();
      }

      switch (domain) {
        case 'button':
        case 'input_button':
          return { domain, service: 'press' };
        case 'automation':
          return { domain, service: 'trigger' };
        case 'vacuum':
          return { domain, service: 'start' };
        default:
          return { domain, service: 'turn_on' };
      }
    }

    default:
      throw unsupported();
  }
}
