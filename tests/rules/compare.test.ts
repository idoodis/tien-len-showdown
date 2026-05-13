import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '@/game/rules/types';
import { beats } from '@/game/rules/compare';
import { detectCombo } from '@/game/rules/combos';

function c(rank: Rank, suit: Suit, id?: number): Card {
  return { id: id ?? Math.floor(Math.random() * 1e9), rank, suit };
}
const combo = (cards: Card[]) => {
  const k = detectCombo(cards);
  if (!k) throw new Error('test combo invalid');
  return k;
};

describe('beats', () => {
  it('higher single beats lower single', () => {
    expect(beats(combo([c('4', 'S')]), combo([c('3', 'S')]))).toBe(true);
    expect(beats(combo([c('3', 'S')]), combo([c('4', 'S')]))).toBe(false);
  });

  it('same rank breaks tie by suit', () => {
    // suit order: S < C < D < H
    expect(beats(combo([c('5', 'H')]), combo([c('5', 'S')]))).toBe(true);
    expect(beats(combo([c('5', 'S')]), combo([c('5', 'H')]))).toBe(false);
  });

  it('pair > single is never legal', () => {
    expect(
      beats(combo([c('K', 'S'), c('K', 'C')]), combo([c('2', 'H')])),
    ).toBe(false);
  });

  it('higher pair beats lower pair', () => {
    expect(
      beats(
        combo([c('7', 'S'), c('7', 'C')]),
        combo([c('5', 'S'), c('5', 'C')]),
      ),
    ).toBe(true);
  });

  it('four-of-a-kind beats single 2', () => {
    expect(
      beats(
        combo([c('3', 'S'), c('3', 'C'), c('3', 'D'), c('3', 'H')]),
        combo([c('2', 'S')]),
      ),
    ).toBe(true);
  });

  it('four-of-a-kind beats pair of 2s', () => {
    expect(
      beats(
        combo([c('3', 'S'), c('3', 'C'), c('3', 'D'), c('3', 'H')]),
        combo([c('2', 'S'), c('2', 'C')]),
      ),
    ).toBe(true);
  });

  it('3-pair-sequence beats single 2 but not a pair of 2s', () => {
    const seq = combo([
      c('3', 'S'), c('3', 'C'),
      c('4', 'D'), c('4', 'H'),
      c('5', 'S'), c('5', 'C'),
    ]);
    expect(beats(seq, combo([c('2', 'H')]))).toBe(true);
    expect(beats(seq, combo([c('2', 'S'), c('2', 'C')]))).toBe(false);
  });

  it('4-pair-sequence beats pair of 2s', () => {
    const seq = combo([
      c('3', 'S'), c('3', 'C'),
      c('4', 'D'), c('4', 'H'),
      c('5', 'S'), c('5', 'C'),
      c('6', 'D'), c('6', 'H'),
    ]);
    expect(beats(seq, combo([c('2', 'S'), c('2', 'C')]))).toBe(true);
  });

  it('straight length must match to compare', () => {
    const s3 = combo([c('3', 'S'), c('4', 'C'), c('5', 'D')]);
    const s4 = combo([c('3', 'S'), c('4', 'C'), c('5', 'D'), c('6', 'H')]);
    expect(beats(s4, s3)).toBe(false);
  });

  it('higher straight of same length beats lower', () => {
    const a = combo([c('4', 'S'), c('5', 'C'), c('6', 'D')]);
    const b = combo([c('3', 'S'), c('4', 'C'), c('5', 'D')]);
    expect(beats(a, b)).toBe(true);
  });
});
