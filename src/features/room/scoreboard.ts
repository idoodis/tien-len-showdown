import type { RoomPlayerView } from '@/features/room/types';

export interface ScoreboardEntry extends RoomPlayerView {
  seatLabel: string;
  isLeader: boolean;
  isWinner: boolean;
}

export function getLeaderIds(players: Array<{ playerId: string; wins: number }>): string[] {
  const maxWins = Math.max(0, ...players.map((player) => player.wins));
  if (maxWins <= 0) return [];
  return players
    .filter((player) => player.wins === maxWins)
    .map((player) => player.playerId);
}

export function buildScoreboard(
  players: RoomPlayerView[],
  winnerPlayerId: string | null = null,
): ScoreboardEntry[] {
  const leaderIds = new Set(getLeaderIds(players));

  return [...players]
    .sort((left, right) => {
      if (right.wins !== left.wins) return right.wins - left.wins;
      if ((left.seatIndex === null) !== (right.seatIndex === null)) {
        return left.seatIndex === null ? 1 : -1;
      }
      if ((left.seatIndex ?? 99) !== (right.seatIndex ?? 99)) {
        return (left.seatIndex ?? 99) - (right.seatIndex ?? 99);
      }
      return left.displayName.localeCompare(right.displayName);
    })
    .map((player) => ({
      ...player,
      seatLabel: player.seatIndex === null ? 'Standing' : `Seat ${player.seatIndex + 1}`,
      isLeader: leaderIds.has(player.playerId),
      isWinner: winnerPlayerId === player.playerId,
    }));
}
