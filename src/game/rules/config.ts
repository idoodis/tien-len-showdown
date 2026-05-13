import type { Rank, RulesConfig, Suit } from './types';

/** Standard Tiến Lên config. 3 is lowest, 2 is highest. */
export const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];

/** Southern Vietnamese convention used by most Tiến Lên decks:
 *  Spades < Clubs < Diamonds < Hearts. */
export const SUITS: Suit[] = ['S', 'C', 'D', 'H'];

export const DEFAULT_CONFIG: RulesConfig = {
  ranks: RANKS,
  suits: SUITS,
  firstCard: { rank: '3', suit: 'S' },
  minStraight: 3,
  minPairSequence: 3,
  bombs: {
    threePairSeqBeatsSingleTwo: true,
    fourPairSeqBeatsPairTwo: true,
    fourKindBeatsTwoAndPair: true,
  },
};

export function rankValue(c: { rank: Rank }, cfg: RulesConfig = DEFAULT_CONFIG): number {
  return cfg.ranks.indexOf(c.rank);
}
export function suitValue(c: { suit: Suit }, cfg: RulesConfig = DEFAULT_CONFIG): number {
  return cfg.suits.indexOf(c.suit);
}

/** Total strength of a card. Higher is stronger. */
export function cardValue(c: { rank: Rank; suit: Suit }, cfg: RulesConfig = DEFAULT_CONFIG): number {
  return rankValue(c, cfg) * cfg.suits.length + suitValue(c, cfg);
}
