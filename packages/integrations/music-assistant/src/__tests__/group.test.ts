import { describe, expect, test } from 'vitest';
import { groupOf } from '../group.ts';
import type { MaPlayer } from '../mapper.ts';

const players = (list: MaPlayer[]) => (id: string) =>
  list.find((player) => player.player_id === id);

describe('the group a player plays in', () => {
  const leader: MaPlayer = { player_id: 'a', group_childs: ['a', 'b', 'c'] };
  const b: MaPlayer = { player_id: 'b', synced_to: 'a' };
  const c: MaPlayer = { player_id: 'c', synced_to: 'a' };
  const all = players([leader, b, c, { player_id: 'd' }]);

  test('a leader and its followers, not counting the leader itself among them', () => {
    expect(groupOf(leader, all)).toEqual({ leader: 'a', members: ['b', 'c'] });
  });

  test('a follower sees the whole group, read from its leader', () => {
    expect(groupOf(b, all)).toEqual({ leader: 'a', members: ['b', 'c'] });
  });

  test('a player on its own, or a leader with nobody following, is in no group', () => {
    expect(groupOf({ player_id: 'd' }, all)).toBeUndefined();
    expect(groupOf({ player_id: 'a', group_childs: ['a'] }, all)).toBeUndefined();
    expect(groupOf({ player_id: 'a', group_childs: [], synced_to: null }, all)).toBeUndefined();
  });

  test('a follower whose leader is not known is in a group of two', () => {
    expect(groupOf({ player_id: 'b', synced_to: 'gone' }, all)).toEqual({
      leader: 'gone',
      members: ['b'],
    });
  });

  test('the children of a group player follow it', () => {
    const group: MaPlayer = { player_id: 'house', group_childs: ['a', 'b'] };
    expect(groupOf({ player_id: 'a', active_group: 'house' }, players([group]))).toEqual({
      leader: 'house',
      members: ['a', 'b'],
    });
  });
});
