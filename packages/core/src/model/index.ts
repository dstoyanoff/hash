import type { ActionCommands, ActionEntity } from './action.ts';
import type { ClimateCommands, ClimateEntity } from './climate.ts';
import type { GenericCommands, GenericEntity } from './generic.ts';
import type { LightCommands, LightEntity } from './light.ts';
import type { MediaPlayerCommands, MediaPlayerEntity } from './media-player.ts';
import type { PersonCommands, PersonEntity } from './person.ts';
import type { SensorCommands, SensorEntity } from './sensor.ts';
import type { SwitchCommands, SwitchEntity } from './switch.ts';
import type { WeatherCommands, WeatherEntity } from './weather.ts';

export * from './base.ts';
export * from './browse.ts';
export * from './history.ts';
export * from './logbook.ts';
export * from './queue.ts';
export * from './action.ts';
export * from './climate.ts';
export * from './generic.ts';
export * from './light.ts';
export * from './media-player.ts';
export * from './person.ts';
export * from './sensor.ts';
export * from './switch.ts';
export * from './weather.ts';

/** Every entity `@hashsome/core` knows how to model. */
export type Entity =
  | MediaPlayerEntity
  | LightEntity
  | ClimateEntity
  | SensorEntity
  | SwitchEntity
  | ActionEntity
  | PersonEntity
  | WeatherEntity
  | GenericEntity;

export type EntityKind = Entity['kind'];

/** An entity as an integration produces it: the model without `ref`, which `BaseIntegration` adds. */
export type EntityInput = Entity extends infer E
  ? E extends Entity
    ? Omit<E, 'ref'>
    : never
  : never;

/** The commands each kind defines, with their argument shapes (`void` = no arguments). */
export interface KindCommands {
  mediaPlayer: MediaPlayerCommands;
  light: LightCommands;
  climate: ClimateCommands;
  sensor: SensorCommands;
  switch: SwitchCommands;
  action: ActionCommands;
  person: PersonCommands;
  weather: WeatherCommands;
  generic: GenericCommands;
}

/** Command names per kind, for validating a command before it reaches a backend. */
export const COMMAND_NAMES: Record<EntityKind, readonly string[]> = {
  mediaPlayer: [
    'play',
    'pause',
    'togglePlay',
    'next',
    'previous',
    'setVolume',
    'setMuted',
    'seek',
    'setShuffle',
    'playMedia',
    'setGroupMembers',
    'leaveGroup',
  ],
  light: ['turnOn', 'turnOff', 'toggle', 'setBrightness', 'setColorTemperature', 'setColor'],
  climate: ['setMode', 'setTargetTemperature', 'setPreset'],
  sensor: [],
  switch: ['turnOn', 'turnOff', 'toggle'],
  action: ['trigger'],
  person: [],
  weather: [],
  generic: [],
};

export function isCommandOf(kind: string, name: string): boolean {
  return (COMMAND_NAMES as Record<string, readonly string[]>)[kind]?.includes(name) ?? false;
}

/** The entity type of one kind. */
export type KindEntity<K extends EntityKind> = Extract<Entity, { kind: K }>;

/** The command names a kind defines. */
export type CommandName<K extends EntityKind> = Extract<keyof KindCommands[K], string>;

/** The argument list of a command: none for a `void` command, otherwise the one arguments object. */
export type CommandArgs<K extends EntityKind, N extends CommandName<K>> = [
  KindCommands[K][N],
] extends [void]
  ? []
  : [args: KindCommands[K][N]];
