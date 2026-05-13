import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/rules/engine';
import { getWinnerSnapshot, shouldScoreCompletedGame } from '@/server/rooms/scoring';

describe('room winner scoring helpers', () => {
  it('builds winner metadata from finishing order and room identities', () => {
    const state = startGame({ playerIds: ['host', 'friend'], seed: 11 });
    state.finishingOrder = [1];

    const winner = getWinnerSnapshot(
      state,
      [
        { playerId: 'host', displayName: 'Host' },
        { playerId: 'friend', displayName: 'Friend' },
      ],
      'game-11',
      '2026-05-13T13:00:00.000Z',
    );

    expect(winner).toEqual({
      winnerPlayerId: 'friend',
      winnerDisplayName: 'Friend',
      completedGameId: 'game-11',
      completedAt: '2026-05-13T13:00:00.000Z',
    });
  });

  it('scores a completed game only once per currentGameId', () => {
    expect(shouldScoreCompletedGame('game-1', null)).toBe(true);
    expect(shouldScoreCompletedGame('game-1', 'game-1')).toBe(false);
    expect(shouldScoreCompletedGame('game-2', 'game-1')).toBe(true);
    expect(shouldScoreCompletedGame(null, 'game-1')).toBe(false);
  });
});
