'use server';

import { revalidatePath } from 'next/cache';
import { getServiceSupabase } from '@/lib/supabase/service';
import { applyMove, startGame, validateQueuedMove } from '@/game/rules/engine';
import type { TableState } from '@/game/rules/types';
import { toHandsMap, toPublicState } from '@/game/state/projection';
import {
  createRoomSchema, joinRoomSchema, leaveSchema, passSchema,
  playAgainSchema, playSchema, queueSchema, sitSchema, standSchema, startSchema,
} from '@/server/validation/inputs';

/** Short URL-friendly room code, hard enough to guess but easy to type. */
function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — fewer mis-reads
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

type Result<T = unknown> = { ok: true } & T | { ok: false; error: string };

async function getRoomByCode(code: string) {
  const admin = getServiceSupabase();
  return admin.from('rooms').select('*').eq('code', code).maybeSingle();
}

// ─── Create room ───────────────────────────────────────────────────────────
export async function createRoomAction(
  input: unknown,
): Promise<Result<{ code: string; roomId: string }>> {
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { playerId, displayName } = parsed.data;
  const admin = getServiceSupabase();

  // try a few codes in case of rare collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data: room, error } = await admin
      .from('rooms')
      .insert({ code, host_player_id: playerId })
      .select('*')
      .single();
    if (error) {
      if ((error.code ?? '').includes('23505')) continue; // unique violation, retry
      return { ok: false, error: error.message };
    }
    await admin.from('room_players').insert({
      room_id: room.id,
      player_id: playerId,
      display_name: displayName,
      is_host: true,
    });
    await admin.from('room_state').insert({ room_id: room.id });
    await admin.from('room_events').insert({
      room_id: room.id,
      kind: 'create',
      player_id: playerId,
      payload: { code },
    });
    return { ok: true, code, roomId: room.id };
  }
  return { ok: false, error: 'could not generate a unique code' };
}

// ─── Join room ──────────────────────────────────────────────────────────────
export async function joinRoomAction(input: unknown): Promise<Result<{ roomId: string }>> {
  const parsed = joinRoomSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId, displayName } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  if (new Date(room.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'room_expired' };
  }

  // Reconnect if the player is already a member; otherwise insert.
  await admin
    .from('room_players')
    .upsert(
      {
        room_id: room.id,
        player_id: playerId,
        display_name: displayName,
        connected: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,player_id' },
    );

  // If room has no host (e.g. previous host left), promote this player.
  if (!room.host_player_id) {
    await admin.from('rooms').update({ host_player_id: playerId }).eq('id', room.id);
    await admin.from('room_players').update({ is_host: true }).match({ room_id: room.id, player_id: playerId });
  }

  await admin.from('room_events').insert({
    room_id: room.id,
    kind: 'join',
    player_id: playerId,
    payload: { displayName },
  });
  return { ok: true, roomId: room.id };
}

// ─── Sit at seat ────────────────────────────────────────────────────────────
export async function sitAction(input: unknown): Promise<Result> {
  const parsed = sitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId, seat } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.status !== 'lobby') return { ok: false, error: 'game_in_progress' };

  // ensure seat is free
  const { data: clash } = await admin
    .from('room_players').select('player_id').eq('room_id', room.id).eq('seat', seat).maybeSingle();
  if (clash && clash.player_id !== playerId) return { ok: false, error: 'seat_taken' };

  const { error } = await admin
    .from('room_players')
    .update({ seat, last_seen_at: new Date().toISOString() })
    .match({ room_id: room.id, player_id: playerId });
  if (error) return { ok: false, error: error.message };

  await admin.from('room_events').insert({
    room_id: room.id,
    kind: 'sit',
    player_id: playerId,
    payload: { seat },
  });
  revalidatePath(`/room/${code}`);
  return { ok: true };
}

export async function standAction(input: unknown): Promise<Result> {
  const parsed = standSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.status !== 'lobby') return { ok: false, error: 'game_in_progress' };
  await admin
    .from('room_players')
    .update({ seat: null })
    .match({ room_id: room.id, player_id: playerId });
  return { ok: true };
}

// ─── Start match ────────────────────────────────────────────────────────────
export async function startGameAction(input: unknown): Promise<Result> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.host_player_id !== playerId) return { ok: false, error: 'host_only' };
  if (room.status !== 'lobby' && room.status !== 'game_over') {
    return { ok: false, error: 'game_in_progress' };
  }

  const { data: seats } = await admin
    .from('room_players').select('player_id, seat, display_name')
    .eq('room_id', room.id).not('seat', 'is', null).order('seat');
  if (!seats || seats.length < 2) return { ok: false, error: 'need_at_least_2_seated' };

  const seed = (Math.random() * 2 ** 31) | 0 || 1;
  const playerIds = seats.map((s) => s.player_id);
  const initialState = startGame({ playerIds, seed });

  const publicState = toPublicState(initialState, 'playing');
  const hands = toHandsMap(initialState);

  await admin.from('room_state').upsert({
    room_id: room.id,
    full_state: initialState,
    public_state: publicState,
    hands,
    queued: {},
    tick: initialState.tick,
    updated_at: new Date().toISOString(),
  });
  await admin.from('rooms').update({
    status: 'playing',
    updated_at: new Date().toISOString(),
  }).eq('id', room.id);

  await admin.from('room_events').insert({
    room_id: room.id, kind: 'start', player_id: playerId, payload: { seed },
  });
  return { ok: true };
}

// ─── Play / Pass ────────────────────────────────────────────────────────────
export async function playAction(input: unknown): Promise<Result> {
  const parsed = playSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId, cardIds } = parsed.data;
  return mutateState(code, async (state) => {
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return { ok: false, error: 'not_seated' };
    const result = applyMove(state, seat, { type: 'play', cardIds });
    if (!result.ok || !result.next) return { ok: false, error: result.error ?? 'invalid_move' };
    return { ok: true, next: result.next, event: { kind: 'play', playerId, payload: { cardIds } } };
  });
}

export async function passAction(input: unknown): Promise<Result> {
  const parsed = passSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId } = parsed.data;
  return mutateState(code, async (state) => {
    const seat = state.players.findIndex((p) => p.id === playerId);
    if (seat < 0) return { ok: false, error: 'not_seated' };
    const result = applyMove(state, seat, { type: 'pass' });
    if (!result.ok || !result.next) return { ok: false, error: result.error ?? 'invalid_move' };
    return { ok: true, next: result.next, event: { kind: 'pass', playerId, payload: {} } };
  });
}

// ─── Queue move ────────────────────────────────────────────────────────────
export async function queueMoveAction(input: unknown): Promise<Result<{ comboKind?: string }>> {
  const parsed = queueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId, cardIds } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  const { data: stateRow } = await admin.from('room_state').select('full_state, queued').eq('room_id', room.id).maybeSingle();
  if (!stateRow?.full_state) return { ok: false, error: 'no_match_running' };
  const state = stateRow.full_state as TableState;
  const seat = state.players.findIndex((p) => p.id === playerId);
  if (seat < 0) return { ok: false, error: 'not_seated' };

  if (cardIds.length === 0) {
    // cancel
    const queued = { ...(stateRow.queued ?? {}) } as Record<string, number[]>;
    delete queued[playerId];
    await admin.from('room_state').update({ queued }).eq('room_id', room.id);
    return { ok: true };
  }
  const check = validateQueuedMove(state, seat, cardIds);
  if (!check.ok) return { ok: false, error: check.error };

  const queued = { ...(stateRow.queued ?? {}), [playerId]: cardIds };
  await admin.from('room_state').update({ queued }).eq('room_id', room.id);
  return { ok: true, comboKind: check.combo.kind };
}

// ─── Leave room ────────────────────────────────────────────────────────────
export async function leaveRoomAction(input: unknown): Promise<Result> {
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: true };

  await admin.from('room_players').delete().match({ room_id: room.id, player_id: playerId });

  // If host left, promote the next connected member.
  if (room.host_player_id === playerId) {
    const { data: next } = await admin
      .from('room_players').select('player_id')
      .eq('room_id', room.id).eq('connected', true)
      .order('joined_at').limit(1).maybeSingle();
    if (next) {
      await admin.from('rooms').update({ host_player_id: next.player_id }).eq('id', room.id);
      await admin.from('room_players').update({ is_host: true }).match({
        room_id: room.id, player_id: next.player_id,
      });
    } else {
      // Empty room — delete it.
      await admin.from('rooms').delete().eq('id', room.id);
    }
  }
  await admin.from('room_events').insert({
    room_id: room.id, kind: 'leave', player_id: playerId,
  });
  return { ok: true };
}

// ─── Play again (reset to lobby) ───────────────────────────────────────────
export async function playAgainAction(input: unknown): Promise<Result> {
  const parsed = playAgainSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { code, playerId } = parsed.data;
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.host_player_id !== playerId) return { ok: false, error: 'host_only' };

  await admin.from('room_state').update({
    full_state: null, public_state: null, hands: null, queued: {}, tick: 0,
    updated_at: new Date().toISOString(),
  }).eq('room_id', room.id);
  await admin.from('rooms').update({ status: 'lobby', updated_at: new Date().toISOString() }).eq('id', room.id);
  await admin.from('room_events').insert({ room_id: room.id, kind: 'play_again', player_id: playerId });
  return { ok: true };
}

// ─── Mutator wrapper ───────────────────────────────────────────────────────
type MutateResult =
  | { ok: true; next: TableState; event: { kind: string; playerId: string; payload: Record<string, unknown> } }
  | { ok: false; error: string };

async function mutateState(
  code: string,
  fn: (state: TableState) => Promise<MutateResult>,
): Promise<Result> {
  const admin = getServiceSupabase();
  const { data: room } = await getRoomByCode(code);
  if (!room) return { ok: false, error: 'room_not_found' };
  const { data: stateRow } = await admin
    .from('room_state').select('full_state, queued').eq('room_id', room.id).maybeSingle();
  if (!stateRow?.full_state) return { ok: false, error: 'no_match_running' };

  const state = stateRow.full_state as TableState;
  const result = await fn(state);
  if (!result.ok) return result;

  const next = result.next;
  const gameOver = next.finishingOrder.length >= next.players.length - 1;
  const status = gameOver ? 'game_over' : 'playing';
  const publicState = toPublicState(next, status);
  const hands = toHandsMap(next);

  // Clear any now-stale queued moves whose cardIds are no longer in hand.
  const queued = stableQueued(stateRow.queued ?? {}, hands);

  await admin.from('room_state').update({
    full_state: next,
    public_state: publicState,
    hands,
    queued,
    tick: next.tick,
    updated_at: new Date().toISOString(),
  }).eq('room_id', room.id);

  if (gameOver) {
    await admin.from('rooms').update({ status, updated_at: new Date().toISOString() }).eq('id', room.id);
    await admin.from('room_events').insert({
      room_id: room.id, kind: 'game_over', player_id: result.event.playerId,
      payload: { finishingOrder: next.finishingOrder },
    });
  } else {
    await admin.from('room_events').insert({
      room_id: room.id, kind: result.event.kind, player_id: result.event.playerId, payload: result.event.payload,
    });
  }
  return { ok: true };
}

function stableQueued(
  q: Record<string, number[]>,
  hands: Record<string, { id: number }[]>,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [pid, ids] of Object.entries(q)) {
    const owned = new Set(hands[pid]?.map((c) => c.id) ?? []);
    if (ids.every((id) => owned.has(id))) out[pid] = ids;
  }
  return out;
}
