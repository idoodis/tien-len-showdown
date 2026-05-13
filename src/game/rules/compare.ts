import type { Combo, RulesConfig } from './types';
import { DEFAULT_CONFIG, cardValue } from './config';
import { isBomb } from './combos';

/**
 * Returns true iff `next` legally beats `current`.
 * Bombs introduce a partial override:
 *  - four-of-a-kind beats single 2, pair of 2s.
 *  - 3-pair-sequence beats single 2.
 *  - 4-pair-sequence beats pair of 2s, single 2.
 *  - A bigger bomb beats a smaller one.
 */
export function beats(
  next: Combo,
  current: Combo,
  cfg: RulesConfig = DEFAULT_CONFIG,
): boolean {
  if (next.kind === 'pass' || current.kind === 'pass') return false;

  // Bombs vs 2s.
  const cur = current;
  const nx = next;

  // Same kind + same length → compare by top card strength.
  if (nx.kind === cur.kind && nx.length === cur.length) {
    return cardValue(nx.top, cfg) > cardValue(cur.top, cfg);
  }

  // Bomb override path.
  const curIsTwoSingle = cur.kind === 'single' && cur.top.rank === '2';
  const curIsTwoPair = cur.kind === 'pair' && cur.top.rank === '2';
  const curIsTwoTriple = cur.kind === 'triple' && cur.top.rank === '2';

  if (nx.kind === 'four-of-a-kind') {
    if (cur.kind === 'four-of-a-kind') {
      return cardValue(nx.top, cfg) > cardValue(cur.top, cfg);
    }
    if (cfg.bombs.fourKindBeatsTwoAndPair && (curIsTwoSingle || curIsTwoPair)) return true;
    // 4-of-a-kind also beats lower 4-of-a-kind already handled. Otherwise: no.
    return false;
  }

  if (nx.kind === 'pair-sequence') {
    // beats a smaller pair-sequence
    if (cur.kind === 'pair-sequence') {
      if (nx.length > cur.length) return true;
      if (nx.length === cur.length) return cardValue(nx.top, cfg) > cardValue(cur.top, cfg);
      return false;
    }
    if (cfg.bombs.threePairSeqBeatsSingleTwo && nx.length >= 3 && curIsTwoSingle) return true;
    if (cfg.bombs.fourPairSeqBeatsPairTwo && nx.length >= 4 && (curIsTwoPair || curIsTwoSingle))
      return true;
    if (cfg.bombs.fourPairSeqBeatsPairTwo && nx.length >= 4 && curIsTwoTriple) return true;
    // beats 3-of-a-kind 2s? Common house rule treats 3 twos as needing four-of-a-kind;
    // we mirror that — no by default.
    return false;
  }

  // Different non-bomb kinds → cannot beat
  return false;
}

/** Lead move (round-opening): anything goes as long as it's a valid combo. */
export function isValidLead(next: Combo): boolean {
  return next.kind !== 'pass';
}

export { isBomb };
