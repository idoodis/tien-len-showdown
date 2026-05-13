import { describe, expect, it } from 'vitest';
import { buildScoreboard, getLeaderIds } from '@/features/room/scoreboard';
import type { RoomPlayerView } from '@/features/room/types';

const players: RoomPlayerView[] = [
  {
    playerId: 'host',
    displayName: 'Host',
    seatIndex: 0,
    seat: 0,
    isHost: true,
    connected: true,
    wins: 2,
  },
  {
    playerId: 'friend',
    displayName: 'Friend',
    seatIndex: 1,
    seat: 1,
    isHost: false,
    connected: true,
    wins: 1,
  },
  {
    playerId: 'bench',
    displayName: 'Bench',
    seatIndex: null,
    seat: null,
    isHost: false,
    connected: true,
    wins: 5,
  },
];

describe('room scoreboard helpers', () => {
  it('maps seated players into scoreboard order with winner and leader flags', () => {
    const scoreboard = buildScoreboard(players, 'host');

    expect(scoreboard).toHaveLength(3);
    expect(scoreboard[0]?.playerId).toBe('bench');
    expect(scoreboard[0]?.seatLabel).toBe('Standing');
    expect(scoreboard[0]?.isLeader).toBe(true);
    expect(scoreboard[1]?.playerId).toBe('host');
    expect(scoreboard[1]?.isWinner).toBe(true);
  });

  it('returns all tied leaders when the room score is tied', () => {
    const leaders = getLeaderIds([
      { playerId: 'host', wins: 3 },
      { playerId: 'friend', wins: 3 },
      { playerId: 'guest', wins: 1 },
    ]);

    expect(leaders.sort()).toEqual(['friend', 'host']);
  });

  it('keeps room win totals intact across rematch-ready views', () => {
    const scoreboard = buildScoreboard(players, null);

    expect(scoreboard.map((entry) => entry.wins)).toEqual([5, 2, 1]);
  });
});
