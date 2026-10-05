import type { EntityBase } from './base.ts';

/** Someone who lives here, and whether they are home. */
export interface PersonEntity extends EntityBase<'person'> {
  /** Where they are: `home`, `away`, or the name of a zone. */
  location: string;
  home: boolean;

  /** A picture of them, when the backend has one. */
  pictureUrl?: string;
}

export type PersonCommands = Record<string, never>;
