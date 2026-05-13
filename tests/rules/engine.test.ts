import { describe, it, expect } from 'vitest';
import { applyMove, startGame, validateQueuedMove } from '@/game/rules/engine';
import type { Card, TableState } from '@/game/rules/types';

function ids(cards: Card[]): number[] {
  return cards.map((c) => c.id);
}

function findCard(state: TableState, seat: number, rank: string, suit: string) {
  return state.players[seat]!.hand.find((c) => c.rank === rank && c.suit === suit);
}

describe('engine — full game flow', () => {
  it('starts with the seat holding the lowest dealt card', () => {
    const s = startGame({ playerIds: ['a', 'b', 'c', 'd'], seed: 12345 });
    const starter = s.players[s.turn]!;
    expect(starter.hand.some((c) => c.id === s.firstCardId)).toBe(true);
    // In a 4-player game with a full deck, the lowest card is always 3♠.
    const first = starter.hand.find((c) => c.id === s.firstCardId)!;
    expect(first.rank).toBe('3');
    expect(first.suit).toBe('S');
  });

  it('rejects moves out of turn', () => {
    const s = startGame({ playerIds: ['a', 'b'], seed: 1 });
    const otherSeat = (s.turn + 1) % 2;
    const r = applyMove(s, otherSeat, { type: 'play', cardIds: [s.players[otherSeat]!.hand[0]!.id] });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('not_your_turn');
  });

  it('first move must contain the table first card', () => {
    const s = startGame({ playerIds: ['a', 'b'], seed: 1 });
    const me = s.players[s.turn]!;
    const notFirst = me.hand.find((c) => c.id !== s.firstCardId)!;
    const r = applyMove(s, s.turn, { type: 'play', cardIds: [notFirst.id] });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('first_play_must_contain_first_card');
  });

  it('cannot pass on lead', () => {
    const s = startGame({ playerIds: ['a', 'b'], seed: 1 });
    const r = applyMove(s, s.turn, { type: 'pass' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('cannot_pass_on_lead');
  });

  it('removes played cards and advances turn', () => {
    const s = startGame({ playerIds: ['a', 'b'], seed: 1 });
    const seat = s.turn;
    const first = s.players[seat]!.hand.find((c) => c.id === s.firstCardId)!;
    const r = applyMove(s, seat, { type: 'play', cardIds: [first.id] });
    expect(r.ok).toBe(true);
    expect(r.next!.players[seat]!.hand.find((c) => c.id === first.id)).toBeUndefined();
    expect(r.next!.turn).not.toBe(seat);
    expect(r.next!.currentCombo?.kind).toBe('single');
  });

  it('queued move validates against current combo', () => {
    const s = startGame({ playerIds: ['a', 'b'], seed: 1 });
    const seat = s.turn;
    const first = s.players[seat]!.hand.find((c) => c.id === s.firstCardId)!;
    const after = applyMove(s, seat, { type: 'play', cardIds: [first.id] }).next!;
    const opp = after.turn;
    const oppHand = after.players[opp]!.hand;
    // any single must strictly beat the lead in card value
    const lead = after.currentCombo!.top;
    for (const card of oppHand) {
      const r = validateQueuedMove(after, opp, [card.id]);
      const shouldBeat = cardStrength(card) > cardStrength(lead);
      expect(r.ok).toBe(shouldBeat);
    }
  });

  it('after everyone except controller passes, controller re-leads with empty trick', () => {
    const s = startGame({ playerIds: ['a', 'b'], seed: 1 });
    const seat = s.turn;
    const first = s.players[seat]!.hand.find((c) => c.id === s.firstCardId)!;
    let st = applyMove(s, seat, { type: 'play', cardIds: [first.id] }).next!;
    // Opponent passes
    const pass = applyMove(st, st.turn, { type: 'pass' });
    expect(pass.ok).toBe(true);
    st = pass.next!;
    expect(st.currentCombo).toBeNull();
    expect(st.turn).toBe(seat);
  });
});

function cardStrength(c: { rank: string; suit: string }): number {
  const ranks = ['3','4','5','6','7','8','9','T','J','Q','K','A','2'];
  const suits = ['S','C','D','H'];
  return ranks.indexOf(c.rank) * 4 + suits.indexOf(c.suit);
}
