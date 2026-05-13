import type { TableState } from '@/game/rules/types';

export interface PlayerIdentity {
  playerId: string;
  displayName: string;
}

export interface WinnerSnapshot {
  winnerPlayerId: string;
  winnerDisplayName: string;
  completedGameId: string;
  completedAt: string;
}

export interface RoomScoreState {
  winsByPlayerId: Record<string, number>;
  lastScoredGameId: string | null;
}

export function getLeaderPlayerIds(
  players: Array<{ playerId: string; wins: number }>,
): string[] {
  const maxWins = Math.max(0, ...players.map((player) => player.wins));
  if (maxWins <= 0) return [];
  return players
    .filter((player) => player.wins === maxWins)
    .map((player) => player.playerId);
}

export function shouldScoreCompletedGame(
  currentGameId: string | null | undefined,
  lastScoredGameId: string | null | undefined,
): boolean {
  return Boolean(currentGameId && currentGameId !== lastScoredGameId);
}

export function getRoomScoreState(rules: unknown): RoomScoreState {
  if (!isRecord(rules)) {
    return { winsByPlayerId: {}, lastScoredGameId: null };
  }

  const scorekeeper = isRecord(rules.scorekeeper) ? rules.scorekeeper : {};
  const winsSource = isRecord(scorekeeper.winsByPlayerId) ? scorekeeper.winsByPlayerId : {};
  const winsByPlayerId = Object.fromEntries(
    Object.entries(winsSource)
      .map(([playerId, wins]) => [playerId, Number.isFinite(wins) ? Number(wins) : 0]),
  );

  return {
    winsByPlayerId,
    lastScoredGameId:
      typeof scorekeeper.lastScoredGameId === 'string' && scorekeeper.lastScoredGameId.length > 0
        ? scorekeeper.lastScoredGameId
        : null,
  };
}

export function applyRoomWinnerScore(
  rules: unknown,
  winnerPlayerId: string,
  currentGameId: string,
): Record<string, unknown> {
  const baseRules = isRecord(rules) ? rules : {};
  const scoreState = getRoomScoreState(baseRules);

  if (!shouldScoreCompletedGame(currentGameId, scoreState.lastScoredGameId)) {
    return { ...baseRules };
  }

  return {
    ...baseRules,
    scorekeeper: {
      ...(isRecord(baseRules.scorekeeper) ? baseRules.scorekeeper : {}),
      winsByPlayerId: {
        ...scoreState.winsByPlayerId,
        [winnerPlayerId]: (scoreState.winsByPlayerId[winnerPlayerId] ?? 0) + 1,
      },
      lastScoredGameId: currentGameId,
    },
  };
}

export function getWinnerSnapshot(
  state: TableState,
  players: PlayerIdentity[],
  currentGameId: string | null | undefined,
  completedAt: string,
): WinnerSnapshot | null {
  const winnerSeat = state.finishingOrder[0];
  if (winnerSeat === undefined) return null;

  const winnerPlayerId = state.players[winnerSeat]?.id;
  if (!winnerPlayerId || !currentGameId) return null;

  return {
    winnerPlayerId,
    winnerDisplayName:
      players.find((player) => player.playerId === winnerPlayerId)?.displayName
      ?? `Seat ${winnerSeat + 1}`,
    completedGameId: currentGameId,
    completedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
