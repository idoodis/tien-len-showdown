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
  });

  it('hidden hands map contains all dealt cards', () => {
    const state = startGame({ playerIds: ['a', 'b'], seed: 99 });
    const hands = toHandsMap(state);
    expect(Object.keys(hands).sort()).toEqual(['a', 'b']);
    expect(hands['a']!.length).toBe(13);
    expect(hands['b']!.length).toBe(13);
  });
});
