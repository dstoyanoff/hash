import type { MaPlayer } from './mapper.ts';

/** A group as Music Assistant ids: the player the stream belongs to, and the players that follow it. */
export interface MaGroup {
  leader: string;
  members: string[];
}

/**
 * The group a player plays in, if any. Music Assistant says it on both sides: a follower has `synced_to` (or
 * `active_group`, for a group player's children), and the leader lists its followers in `group_childs`, which can
 * count the leader itself. A follower does not carry the others, so they are read from its leader, looked up by id;
 * a leader that is not known (yet) leaves the follower in a group of two.
 */
export function groupOf(
  player: MaPlayer,
  lookup: (id: string) => MaPlayer | undefined,
): MaGroup | undefined {
  const followed = player.synced_to ?? player.active_group ?? undefined;
  const leads = (player.group_childs ?? []).some((id) => id !== player.player_id);
  const leader = followed ?? (leads ? player.player_id : undefined);
  if (leader === undefined) {
    return undefined;
  }

  const source = leader === player.player_id ? player : lookup(leader);
  const members = (source?.group_childs ?? []).filter((id) => id !== leader);
  if (leader !== player.player_id && !members.includes(player.player_id)) {
    members.push(player.player_id);
  }

  return members.length > 0 ? { leader, members } : undefined;
}
