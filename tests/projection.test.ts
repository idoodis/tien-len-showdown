import { describe, it, expect } from 'vitest';
import { startGame } from '@/game/rules/engine';
import { toHandsMap, toPublicState } from '@/game/state/projection';

describe('public state projection', () => {
  it('strips card content from opponents but preserves counts', () => {
    const state = startGame({ playerIds: ['a', 'b', 'c', 'd'], seed: 1234 });
    const pub = toPublicState(state, 'playing');
    for (const p of pub.players) {
      expect(p.handCount).toBe(13);
      // The public projection must never carry actual hand contents.
      expect((p as unknown as { hand?: unknown }).hand).toBeUndefined();
    }
    expect(pub.currentGameId).toBeNull();
    expect(pub.winnerPlayerId).toBeNull();
    expect(pub.completedGameId).toBeNull();
  });

  it('hidden hands map contains all dealt cards', () => {
    const state = startGame({ playerIds: ['a', 'b'], seed: 99 });
    const hands = toHandsMap(state);
    expect(Object.keys(hands).sort()).toEqual(['a', 'b']);
    expect(hands['a']!.length).toBe(13);
    expect(hands['b']!.length).toBe(13);
  });

  it('keeps explicit winner metadata in the public projection', () => {
    const state = startGame({ playerIds: ['host', 'friend'], seed: 77 });
    const pub = toPublicState(state, 'game_over', {
      currentGameId: 'game-2',
      winnerPlayerId: 'host',
      winnerDisplayName: 'Host',
      completedGameId: 'game-2',
      completedAt: '2026-05-13T12:00:00.000Z',
    });

    expect(pub.currentGameId).toBe('game-2');
    expect(pub.winnerPlayerId).toBe('host');
    expect(pub.winnerDisplayName).toBe('Host');
    expect(pub.completedGameId).toBe('game-2');
    expect(pub.completedAt).toBe('2026-05-13T12:00:00.000Z');
  });
});
