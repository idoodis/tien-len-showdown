import type { Card, RulesConfig } from './types';
import { DEFAULT_CONFIG, cardValue } from './config';

export function buildDeck(cfg: RulesConfig = DEFAULT_CONFIG): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const rank of cfg.ranks) {
    for (const suit of cfg.suits) {
      deck.push({ id: id++, rank, suit });
    }
  }
  return deck;
}

/** Deterministic xorshift32 PRNG so server, replay, and tests agree. */
export function makeRng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13; s |= 0;
    s ^= s >>> 17;
    s ^= s << 5; s |= 0;
    return ((s >>> 0) % 0xffffffff) / 0xffffffff;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Deal 13 cards to each of `n` players. */
export function deal(seed: number, n: number, cfg: RulesConfig = DEFAULT_CONFIG): Card[][] {
  const rng = makeRng(seed);
  const deck = shuffle(buildDeck(cfg), rng);
  const hands: Card[][] = Array.from({ length: n }, () => []);
  // Standard Tiến Lên uses 13 cards each, regardless of player count 2..4.
  const handSize = 13;
  for (let i = 0; i < handSize * n; i++) {
    hands[i % n]!.push(deck[i]!);
  }
  return hands.map((h) => sortHand(h, cfg));
}

export function sortHand(cards: Card[], cfg: RulesConfig = DEFAULT_CONFIG): Card[] {
  return cards.slice().sort((a, b) => cardValue(a, cfg) - cardValue(b, cfg));
}
