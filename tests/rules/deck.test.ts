import { describe, it, expect } from 'vitest';
import { buildDeck, deal, makeRng, shuffle, sortHand } from '@/game/rules/deck';
import { DEFAULT_CONFIG, cardValue } from '@/game/rules/config';

describe('deck', () => {
  it('builds a 52-card deck of unique cards', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('shuffles deterministically with the same seed', () => {
    const a = shuffle(buildDeck(), makeRng(7));
    const b = shuffle(buildDeck(), makeRng(7));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('deals 13 cards per player and partitions the deck', () => {
    const hands = deal(42, 4);
    expect(hands).toHaveLength(4);
    for (const h of hands) expect(h).toHaveLength(13);
    const ids = new Set(hands.flat().map((c) => c.id));
    expect(ids.size).toBe(52);
  });

  it('sorts hand by total card value ascending', () => {
    const deck = buildDeck();
    const sorted = sortHand(deck);
    for (let i = 1; i < sorted.length; i++) {
      expect(cardValue(sorted[i]!, DEFAULT_CONFIG)).toBeGreaterThan(
        cardValue(sorted[i - 1]!, DEFAULT_CONFIG),
      );
    }
  });
});
