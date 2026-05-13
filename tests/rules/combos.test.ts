import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '@/game/rules/types';
import { detectCombo } from '@/game/rules/combos';

function c(rank: Rank, suit: Suit, id = Math.random()): Card {
  return { id: Math.floor(id * 1e9), rank, suit };
}

describe('detectCombo', () => {
  it('detects single', () => {
    expect(detectCombo([c('3', 'S')])?.kind).toBe('single');
  });

  it('detects pair', () => {
    expect(detectCombo([c('5', 'S'), c('5', 'H')])?.kind).toBe('pair');
  });

  it('rejects pair of different ranks', () => {
    expect(detectCombo([c('5', 'S'), c('6', 'H')])).toBeNull();
  });

  it('detects triple', () => {
    expect(detectCombo([c('9', 'S'), c('9', 'C'), c('9', 'D')])?.kind).toBe('triple');
  });

  it('detects four-of-a-kind', () => {
    expect(
      detectCombo([c('7', 'S'), c('7', 'C'), c('7', 'D'), c('7', 'H')])?.kind,
    ).toBe('four-of-a-kind');
  });

  it('detects straight of length 3+', () => {
    const combo = detectCombo([c('3', 'S'), c('4', 'C'), c('5', 'D')]);
    expect(combo?.kind).toBe('straight');
    expect(combo?.length).toBe(3);
  });

  it('rejects straight that contains a 2', () => {
    expect(
      detectCombo([c('A', 'S'), c('2', 'C'), c('3', 'D')]),
    ).toBeNull();
    expect(
      detectCombo([c('K', 'S'), c('A', 'C'), c('2', 'D')]),
    ).toBeNull();
  });

  it('rejects non-consecutive straight', () => {
    expect(detectCombo([c('3', 'S'), c('4', 'C'), c('6', 'D')])).toBeNull();
  });

  it('detects pair sequence (đôi thông) of >=3 pairs', () => {
    const combo = detectCombo([
      c('3', 'S'), c('3', 'C'),
      c('4', 'D'), c('4', 'H'),
      c('5', 'S'), c('5', 'C'),
    ]);
    expect(combo?.kind).toBe('pair-sequence');
    expect(combo?.length).toBe(3);
  });

  it('rejects pair sequence with a 2', () => {
    expect(
      detectCombo([
        c('A', 'S'), c('A', 'C'),
        c('2', 'D'), c('2', 'H'),
        c('3', 'S'), c('3', 'C'),
      ]),
    ).toBeNull();
  });

  it('rejects pair sequence with a missing pair', () => {
    expect(
      detectCombo([
        c('3', 'S'), c('3', 'C'),
        c('4', 'D'),
        c('5', 'S'), c('5', 'C'),
      ]),
    ).toBeNull();
  });
});
