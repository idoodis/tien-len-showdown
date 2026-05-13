import type {
  Card,
  Combo,
  Move,
  MoveResult,
  PlayerState,
  RulesConfig,
  TableState,
} from './types';
import { DEFAULT_CONFIG, cardValue } from './config';
import { detectCombo, detectFromIds } from './combos';
import { beats, isValidLead } from './compare';
import { deal, sortHand } from './deck';

export interface StartOptions {
  playerIds: string[];
  seed: number;
  config?: RulesConfig;
}

export function startGame({ playerIds, seed, config }: StartOptions): TableState {
  const cfg = config ?? DEFAULT_CONFIG;
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error(`unsupported player count: ${playerIds.length}`);
  }
  const hands = deal(seed, playerIds.length, cfg);
  const players: PlayerState[] = playerIds.map((id, seat) => ({
    id,
    seat,
    hand: hands[seat]!,
    finishedAt: null,
    connected: true,
  }));

  // Lowest-card-out rule: whoever holds the lowest card dealt leads first
  // and must include that card in their first play.
  let starter = 0;
  let firstCardId = players[0]!.hand[0]!.id;
  let firstVal = cardValue(players[0]!.hand[0]!, cfg);
  for (let s = 0; s < players.length; s++) {
    for (const card of players[s]!.hand) {
      const v = cardValue(card, cfg);
      if (v < firstVal) {
        firstVal = v;
        firstCardId = card.id;
        starter = s;
      }
    }
  }

  return {
    config: cfg,
    players,
    turn: starter,
    currentCombo: null,
    controllingSeat: starter,
    passed: [],
    finishingOrder: [],
    firstRoundDone: false,
    firstCardId,
    tick: 0,
  };
}

/** Apply a move to the state. Pure: returns a fresh state on success. */
export function applyMove(state: TableState, seat: number, move: Move): MoveResult {
  const cfg = state.config;
  if (seat !== state.turn) return { ok: false, error: 'not_your_turn' };
  const player = state.players[seat];
  if (!player) return { ok: false, error: 'no_such_seat' };
  if (player.finishedAt !== null) return { ok: false, error: 'already_finished' };

  if (move.type === 'pass') {
    if (state.currentCombo === null) return { ok: false, error: 'cannot_pass_on_lead' };
    return advancePass(state, seat);
  }

  const { combo, cards } = detectFromIds(move.cardIds, player.hand, cfg);
  if (!combo) return { ok: false, error: 'invalid_combo' };

  // First round constraint: opener must include the table's first card.
  if (!state.firstRoundDone && state.currentCombo === null) {
    const hasFirst = cards.some((c) => c.id === state.firstCardId);
    if (!hasFirst) return { ok: false, error: 'first_play_must_contain_first_card' };
  }

  if (state.currentCombo === null) {
    if (!isValidLead(combo)) return { ok: false, error: 'invalid_lead' };
  } else if (!beats(combo, state.currentCombo, cfg)) {
    return { ok: false, error: 'does_not_beat_current' };
  }

  return advancePlay(state, seat, combo, cards);
}

function advancePass(state: TableState, seat: number): MoveResult {
  const passed = state.passed.includes(seat) ? state.passed : [...state.passed, seat];
  const active = activeSeats(state);
  const stillIn = active.filter((s) => !passed.includes(s) && s !== state.controllingSeat);

  let next: TableState = {
    ...state,
    passed,
    turn: nextSeat(state, seat),
    tick: state.tick + 1,
  };

  // If everyone except the controller passed, controller leads a fresh round —
  // unless the controller already finished, in which case lead falls to the
  // next active seat after the controller.
  if (stillIn.length === 0 && state.controllingSeat !== null) {
    const controller = state.players[state.controllingSeat];
    const leader =
      controller && controller.finishedAt === null
        ? state.controllingSeat
        : nextSeatFrom(state.players, state.controllingSeat);
    next = {
      ...next,
      currentCombo: null,
      passed: [],
      turn: leader,
      controllingSeat: leader,
    };
  }
  return { ok: true, next };
}

function advancePlay(
  state: TableState,
  seat: number,
  combo: Combo,
  cards: Card[],
): MoveResult {
  const cfg = state.config;
  const playedIds = new Set(cards.map((c) => c.id));
  const players = state.players.map((p) => {
    if (p.seat !== seat) return p;
    return {
      ...p,
      hand: sortHand(p.hand.filter((c) => !playedIds.has(c.id)), cfg),
    };
  });

  let finishingOrder = state.finishingOrder;
  const me = players[seat]!;
  let finished = false;
  if (me.hand.length === 0 && me.finishedAt === null) {
    const finishedAt = state.finishingOrder.length;
    players[seat] = { ...me, finishedAt };
    finishingOrder = [...state.finishingOrder, seat];
    finished = true;
  }

  const remainingActive = players.filter((p) => p.finishedAt === null).map((p) => p.seat);
  const gameOver = remainingActive.length <= 1;

  let finalOrder: number[] | undefined;
  if (gameOver && remainingActive.length === 1) {
    finalOrder = [...finishingOrder, remainingActive[0]!];
  } else if (gameOver) {
    finalOrder = finishingOrder;
  }

  const newState: TableState = {
    ...state,
    players,
    currentCombo: combo,
    controllingSeat: seat,
    passed: [],
    turn: nextSeatFrom(players, seat),
    firstRoundDone: true,
    finishingOrder,
    tick: state.tick + 1,
  };

  return { ok: true, combo, next: newState, finished, gameOver, finalOrder };
}

function activeSeats(state: TableState): number[] {
  return state.players.filter((p) => p.finishedAt === null).map((p) => p.seat);
}

function nextSeat(state: TableState, from: number): number {
  return nextSeatFrom(state.players, from);
}

function nextSeatFrom(players: PlayerState[], from: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (players[idx]!.finishedAt === null) return idx;
  }
  return from;
}

/** Public helpers used by UI + server actions. */
export function validateQueuedMove(
  state: TableState,
  seat: number,
  cardIds: number[],
): { ok: true; combo: Combo } | { ok: false; error: string } {
  const player = state.players[seat];
  if (!player) return { ok: false, error: 'no_such_seat' };
  const { combo } = detectFromIds(cardIds, player.hand, state.config);
  if (!combo) return { ok: false, error: 'invalid_combo' };
  if (state.currentCombo === null) {
    if (!state.firstRoundDone) {
      const ok = combo.cards.some((c) => c.id === state.firstCardId);
      if (!ok) return { ok: false, error: 'first_play_must_contain_first_card' };
    }
    return isValidLead(combo) ? { ok: true, combo } : { ok: false, error: 'invalid_lead' };
  }
  return beats(combo, state.currentCombo, state.config)
    ? { ok: true, combo }
    : { ok: false, error: 'does_not_beat_current' };
}

export { detectCombo };
