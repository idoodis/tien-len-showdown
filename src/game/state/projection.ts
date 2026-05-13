import type { Card, Combo, TableState } from '@/game/rules/types';

/** Sanitized view of TableState safe to broadcast to anyone in the room.
 *  Hands are replaced with counts; everything else is informational. */
export interface PublicState {
  status: 'lobby' | 'dealing' | 'playing' | 'round_over' | 'game_over';
  turn: number;
  controllingSeat: number | null;
  passed: number[];
  finishingOrder: number[];
  firstRoundDone: boolean;
  firstCardId: number;
  currentCombo: Combo | null;
  players: Array<{
    seat: number;
    playerId: string;
    handCount: number;
    finishedAt: number | null;
  }>;
  tick: number;
}

export function toPublicState(state: TableState, status: PublicState['status']): PublicState {
  return {
    status,
    turn: state.turn,
    controllingSeat: state.controllingSeat,
    passed: state.passed,
    finishingOrder: state.finishingOrder,
    firstRoundDone: state.firstRoundDone,
    firstCardId: state.firstCardId,
    currentCombo: state.currentCombo,
    players: state.players.map((p) => ({
      seat: p.seat,
      playerId: p.id,
      handCount: p.hand.length,
      finishedAt: p.finishedAt,
    })),
    tick: state.tick,
  };
}

/** Per-player hidden hand snapshot. Stored server-side, fetched only by the owner. */
export function toHandsMap(state: TableState): Record<string, Card[]> {
  const out: Record<string, Card[]> = {};
  for (const p of state.players) out[p.id] = p.hand;
  return out;
}
