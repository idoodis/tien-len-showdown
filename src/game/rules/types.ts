// Tiến Lên rules — shared types.
// Pure data, no I/O. Safe to use on server + client.

export type Suit = 'S' | 'C' | 'D' | 'H'; // spades, clubs, diamonds, hearts
export type Rank =
  | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  /** Stable id 0..51, equals rankIndex * 4 + suitIndex (config-dependent). */
  id: number;
  rank: Rank;
  suit: Suit;
}

export type ComboKind =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'        // run of >=3 consecutive ranks, no 2s
  | 'pair-sequence'   // đôi thông: >=3 consecutive pairs, no 2s
  | 'four-of-a-kind'  // bomb (tứ quý)
  | 'pass';

export interface Combo {
  kind: ComboKind;
  cards: Card[];
  /** Top card determining strength inside the kind's class. */
  top: Card;
  /** Length in ranks (1 for single/pair/triple, n for straight/pair-seq). */
  length: number;
}

export interface RulesConfig {
  /** Ascending rank order. */
  ranks: Rank[];
  /** Suit order, weakest to strongest. */
  suits: Suit[];
  /** Which card starts the very first round of a fresh game. */
  firstCard: { rank: Rank; suit: Suit };
  /** Minimum length of a straight / pair-sequence. */
  minStraight: number;
  minPairSequence: number;
  /** Bomb hierarchy: which combos beat a played 2. */
  bombs: {
    /** 3 consecutive pairs (đôi thông 3) beats a single 2. */
    threePairSeqBeatsSingleTwo: boolean;
    /** 4 consecutive pairs beats a pair of 2s / single 2 / triple 2s. */
    fourPairSeqBeatsPairTwo: boolean;
    /** Four-of-a-kind beats single 2 and pair of 2s. */
    fourKindBeatsTwoAndPair: boolean;
  };
}

export interface PlayerState {
  id: string;
  seat: number;
  hand: Card[];
  /** Finishing position once they empty their hand (0 = winner). */
  finishedAt: number | null;
  connected: boolean;
}

export interface TableState {
  config: RulesConfig;
  players: PlayerState[];
  /** Seat index whose turn it is. */
  turn: number;
  /** Current trick on the table; empty array means the round is open. */
  currentCombo: Combo | null;
  /** Seat that controls the round (won the last trick). */
  controllingSeat: number | null;
  /** Seats that have passed this round, by seat index. */
  passed: number[];
  /** Order in which seats have finished (seat indices). */
  finishingOrder: number[];
  /** Has this game started the first round? Used for the leading-card rule. */
  firstRoundDone: boolean;
  /** The card that must appear in the very first lead. Lowest card actually dealt. */
  firstCardId: number;
  /** Monotonic turn counter for debugging / event log. */
  tick: number;
}

export type Move =
  | { type: 'play'; cardIds: number[] }
  | { type: 'pass' };

export interface MoveResult {
  ok: boolean;
  error?: string;
  combo?: Combo;
  /** Returns the new authoritative state on success. */
  next?: TableState;
  /** Set when this move caused the player to finish. */
  finished?: boolean;
  /** Set when this move ends the game. */
  gameOver?: boolean;
  /** Final seat order on game over. */
  finalOrder?: number[];
}
