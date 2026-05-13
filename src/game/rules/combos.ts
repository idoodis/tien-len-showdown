import type { Card, Combo, RulesConfig } from './types';
import { DEFAULT_CONFIG, cardValue, rankValue } from './config';

function topCard(cards: Card[], cfg: RulesConfig): Card {
  return cards.reduce((a, b) => (cardValue(a, cfg) >= cardValue(b, cfg) ? a : b));
}

function groupByRank(cards: Card[]): Map<string, Card[]> {
  const m = new Map<string, Card[]>();
  for (const c of cards) {
    const arr = m.get(c.rank);
    if (arr) arr.push(c); else m.set(c.rank, [c]);
  }
  return m;
}

function allSameRank(cards: Card[]): boolean {
  return cards.every((c) => c.rank === cards[0]!.rank);
}

/** Attempt to identify a combo from a multiset of cards. Returns null on invalid shape. */
export function detectCombo(cards: Card[], cfg: RulesConfig = DEFAULT_CONFIG): Combo | null {
  if (cards.length === 0) return null;

  // Single / pair / triple — exact same-rank shapes.
  if (cards.length === 1) {
    return { kind: 'single', cards, top: topCard(cards, cfg), length: 1 };
  }
  if (cards.length === 2) {
    if (!allSameRank(cards)) return null;
    return { kind: 'pair', cards, top: topCard(cards, cfg), length: 1 };
  }
  if (cards.length === 3 && allSameRank(cards)) {
    return { kind: 'triple', cards, top: topCard(cards, cfg), length: 1 };
  }

  // Four of a kind (bomb)
  if (cards.length === 4 && allSameRank(cards)) {
    return { kind: 'four-of-a-kind', cards, top: topCard(cards, cfg), length: 1 };
  }

  // Straight or pair-sequence — neither may contain a 2.
  if (cards.some((c) => c.rank === '2')) return null;

  // Pair-sequence: even length, groups by rank are all pairs, ranks consecutive.
  if (cards.length % 2 === 0 && cards.length / 2 >= cfg.minPairSequence) {
    const groups = groupByRank(cards);
    if ([...groups.values()].every((g) => g.length === 2)) {
      const ranks = [...groups.keys()].sort(
        (a, b) => cfg.ranks.indexOf(a as Card['rank']) - cfg.ranks.indexOf(b as Card['rank']),
      );
      if (ranks.length === cards.length / 2 && isConsecutive(ranks, cfg)) {
        return {
          kind: 'pair-sequence',
          cards,
          top: topCard(cards, cfg),
          length: ranks.length,
        };
      }
    }
  }

  // Straight: each rank appears exactly once, length >= minStraight, consecutive ranks.
  if (cards.length >= cfg.minStraight) {
    const groups = groupByRank(cards);
    if ([...groups.values()].every((g) => g.length === 1)) {
      const ranks = [...groups.keys()].sort(
        (a, b) => cfg.ranks.indexOf(a as Card['rank']) - cfg.ranks.indexOf(b as Card['rank']),
      );
      if (isConsecutive(ranks, cfg)) {
        return { kind: 'straight', cards, top: topCard(cards, cfg), length: ranks.length };
      }
    }
  }

  return null;
}

function isConsecutive(ranks: string[], cfg: RulesConfig): boolean {
  for (let i = 1; i < ranks.length; i++) {
    const a = cfg.ranks.indexOf(ranks[i - 1] as Card['rank']);
    const b = cfg.ranks.indexOf(ranks[i] as Card['rank']);
    if (b !== a + 1) return false;
    // never include 2 in straights / pair sequences
    if (ranks[i] === '2' || ranks[i - 1] === '2') return false;
  }
  return true;
}

/** Convenience: detect combo from card ids against the player's hand. */
export function detectFromIds(
  cardIds: number[],
  hand: Card[],
  cfg: RulesConfig = DEFAULT_CONFIG,
): { combo: Combo | null; cards: Card[] } {
  const map = new Map(hand.map((c) => [c.id, c]));
  const cards: Card[] = [];
  for (const id of cardIds) {
    const c = map.get(id);
    if (!c) return { combo: null, cards: [] };
    cards.push(c);
  }
  return { combo: detectCombo(cards, cfg), cards };
}

export function isBomb(combo: Combo): boolean {
  return combo.kind === 'four-of-a-kind' || combo.kind === 'pair-sequence';
}

export function rankIndex(c: Card, cfg: RulesConfig = DEFAULT_CONFIG): number {
  return rankValue(c, cfg);
}
