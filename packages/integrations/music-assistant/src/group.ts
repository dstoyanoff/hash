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
 * a leader that is not known (yet) leaves the follower in a group of two. A follower's own report can be behind its
 * leader's (the leader lists it while it still says nothing, until it has started), so a player that another lists
 * in `group_childs` follows that one, given `all` the players there are.
 */
export function groupOf(
  player: MaPlayer,
  lookup: (id: string) => MaPlayer | undefined,
  all: Iterable<MaPlayer> = [],
): MaGroup | undefined {
  const followed = player.synced_to ?? player.active_group ?? ledBy(player, all) ?? undefined;
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

/** The player that lists this one among its followers, if any. */
function ledBy(player: MaPlayer, all: Iterable<MaPlayer>): string | undefined {
  for (const other of all) {
    if (
      other.player_id !== player.player_id &&
      (other.group_childs ?? []).includes(player.player_id)
    ) {
      return other.player_id;
    }
  }

  return undefined;
}
