import 'server-only';

import { getServiceSupabase } from '@/lib/supabase/service';
import { applyMove, startGame, validateQueuedMove } from '@/game/rules/engine';
import type { TableState } from '@/game/rules/types';
import { toHandsMap, toPublicState } from '@/game/state/projection';
import type { ApiError, ApiSuccess, RoomPlayerView, RoomStateView } from '@/features/room/types';
import {
  createRoomSchema,
  joinRoomSchema,
  leaveSchema,
  passSchema,
  playAgainSchema,
  playSchema,
  queueSchema,
  sitSchema,
  standSchema,
  startSchema,
} from '@/server/validation/inputs';

type RoomResult<T> = ApiSuccess<T> | ApiError;

interface RoomRow {
  id: string;
  code: string;
  status: string;
  host_player_id: string | null;
  expires_at: string;
}

function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

function fail(status: number, code: string, error: string): ApiError & { status: number } {
  return { ok: false, status, code, error };
}

function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function getRoomByCode(code: string): Promise<RoomResult<RoomRow>> {
  const admin = getServiceSupabase();
  const normalizedCode = normalizeRoomCode(code);
  const { data, error } = await admin
    .from('rooms')
    .select('id, code, status, host_player_id, expires_at')
    .ilike('code', normalizedCode)
    .maybeSingle();

  if (error) {
    console.error('[rooms:getRoomByCode]', error);
    return fail(500, 'room_lookup_failed', 'Could not load this room.');
  }
  if (!data) return fail(404, 'room_not_found', 'Room not found. Check the invite link or room code.');

  return ok(data as RoomRow);
}

function toPlayerView(row: {
  player_id: string;
  display_name: string;
  seat: number | null;
  is_host: boolean;
  connected: boolean;
}): RoomPlayerView {
  return {
    playerId: row.player_id,
    displayName: row.display_name,
    seatIndex: row.seat,
    seat: row.seat,
    isHost: row.is_host,
    connected: row.connected,
  };
}

async function loadRoomState(room: RoomRow, playerId?: string): Promise<RoomResult<RoomStateView>> {
  const admin = getServiceSupabase();
  const [{ data: stateRow, error: stateError }, { data: playerRows, error: playerError }] = await Promise.all([
    admin
      .from('room_state')
      .select('public_state, hands, queued, tick')
      .eq('room_id', room.id)
      .maybeSingle(),
    admin
      .from('room_players')
      .select('player_id, display_name, seat, is_host, connected')
      .eq('room_id', room.id)
      .order('seat'),
  ]);

  if (stateError) {
    console.error('[rooms:loadRoomState:state]', stateError);
    return fail(500, 'room_state_lookup_failed', 'Could not load room state.');
  }
  if (playerError) {
    console.error('[rooms:loadRoomState:players]', playerError);
    return fail(500, 'room_players_lookup_failed', 'Could not load room players.');
  }

  const players = (playerRows ?? []).map(toPlayerView);
  const seats: Array<RoomPlayerView | null> = [null, null, null, null];
  for (const player of players) {
    if (player.seatIndex !== null) seats[player.seatIndex] = player;
  }

  const isMember = !!playerId && players.some((player) => player.playerId === playerId);
  const hands = (stateRow?.hands ?? {}) as Record<string, RoomStateView['yourHand']>;
  const queued = (stateRow?.queued ?? {}) as Record<string, number[]>;
  const publicState = (stateRow?.public_state ?? null) as RoomStateView['publicState'];
  const tick = stateRow?.tick ?? publicState?.tick ?? 0;

  return ok({
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      hostPlayerId: room.host_player_id,
      publicState,
    },
    players,
    seats,
    publicState,
    yourHand: isMember && playerId ? hands[playerId] ?? null : null,
    yourQueued: isMember && playerId ? queued[playerId] ?? null : null,
    tick,
    isMember,
  });
}

export async function fetchRoomState(code: string, playerId?: string): Promise<RoomResult<RoomStateView>> {
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  return loadRoomState(roomResult.data, playerId);
}

export async function createRoom(input: unknown): Promise<RoomResult<{ roomCode: string; room: RoomStateView }>> {
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return fail(400, 'invalid_create_room', parsed.error.issues[0]?.message ?? 'Invalid create room payload.');
  }

  const { playerId, displayName } = parsed.data;
  const admin = getServiceSupabase();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = generateRoomCode();
    const { data: room, error: roomError } = await admin
      .from('rooms')
      .insert({
        code: roomCode,
        host_player_id: playerId,
        status: 'lobby',
      })
      .select('id, code, status, host_player_id, expires_at')
      .single();

    if (roomError) {
      if ((roomError.code ?? '') === '23505') continue;
      console.error('[rooms:createRoom:room]', roomError);
      return fail(500, 'create_room_failed', 'Could not create a new room.');
    }

    const now = new Date().toISOString();
    const [playerInsert, stateInsert, eventInsert] = await Promise.all([
      admin.from('room_players').insert({
        room_id: room.id,
        player_id: playerId,
        display_name: displayName,
        is_host: true,
        connected: true,
        last_seen_at: now,
      }),
      admin.from('room_state').insert({ room_id: room.id }),
      admin.from('room_events').insert({
        room_id: room.id,
        kind: 'create',
        player_id: playerId,
        payload: { displayName, roomCode },
      }),
    ]);

    if (playerInsert.error || stateInsert.error || eventInsert.error) {
      console.error('[rooms:createRoom:setup]', {
        playerInsert: playerInsert.error,
        stateInsert: stateInsert.error,
        eventInsert: eventInsert.error,
      });
      return fail(500, 'create_room_failed', 'Room created, but room setup did not finish cleanly.');
    }

    const roomState = await loadRoomState(room as RoomRow, playerId);
    if (!roomState.ok) return roomState;

    return ok({
      roomCode,
      room: roomState.data,
    });
  }

  return fail(500, 'room_code_collision', 'Could not generate a unique room code. Please try again.');
}

export async function joinRoom(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; displayName?: string; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = joinRoomSchema.safeParse({
    code,
    playerId: raw.playerId,
    displayName: raw.displayName,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_join_room', parsed.error.issues[0]?.message ?? 'Invalid join room payload.');
  }

  const { playerId, displayName } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;

  if (new Date(room.expires_at).getTime() < Date.now()) {
    return fail(410, 'room_expired', 'This room has expired. Create a fresh room and try again.');
  }

  const admin = getServiceSupabase();
  const { data: existingMember, error: existingMemberError } = await admin
    .from('room_players')
    .select('room_id, player_id')
    .match({ room_id: room.id, player_id: playerId })
    .maybeSingle();

  if (existingMemberError) {
    console.error('[rooms:joinRoom:existingMember]', existingMemberError);
    return fail(500, 'join_room_failed', 'Could not join the room right now.');
  }

  const membershipMutation = existingMember
    ? await admin
      .from('room_players')
      .update({
        display_name: displayName,
        connected: true,
        last_seen_at: new Date().toISOString(),
      })
      .match({ room_id: room.id, player_id: playerId })
    : await admin
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: playerId,
        display_name: displayName,
        connected: true,
        last_seen_at: new Date().toISOString(),
      });

  if (membershipMutation.error) {
    console.error('[rooms:joinRoom:membershipMutation]', membershipMutation.error);
    return fail(500, 'join_room_failed', 'Could not join the room right now.');
  }

  if (!room.host_player_id) {
    await Promise.all([
      admin.from('rooms').update({ host_player_id: playerId }).eq('id', room.id),
      admin.from('room_players').update({ is_host: true }).match({ room_id: room.id, player_id: playerId }),
    ]);
    room.host_player_id = playerId;
  }

  await admin.from('room_events').insert({
    room_id: room.id,
    kind: 'join',
    player_id: playerId,
    payload: { displayName },
  });

  return loadRoomState(room, playerId);
}

export async function sitInSeat(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; displayName?: string; seatIndex?: number; seat?: number; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const requestedSeat = raw.seatIndex ?? raw.seat;
  const parsed = sitSchema.safeParse({
    code,
    playerId: raw.playerId,
    displayName: raw.displayName,
    seat: requestedSeat,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_sit', parsed.error.issues[0]?.message ?? 'Invalid sit payload.');
  }

  const { playerId, displayName, seat } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;

  if (room.status !== 'lobby' && room.status !== 'game_over') {
    return fail(409, 'game_in_progress', 'You can only change seats while the room is in the lobby.');
  }

  const admin = getServiceSupabase();
  const { data: playerRows, error: playerLookupError } = await admin
    .from('room_players')
    .select('player_id, display_name, seat')
    .eq('room_id', room.id);

  if (playerLookupError) {
    console.error('[rooms:sitInSeat:lookup]', playerLookupError);
    return fail(500, 'room_players_lookup_failed', 'Could not check the current seats.');
  }

  const me = (playerRows ?? []).find((row) => row.player_id === playerId);
  const occupant = (playerRows ?? []).find((row) => row.seat === seat);

  if (occupant && occupant.player_id !== playerId) {
    return fail(409, 'seat_taken', `Seat ${seat + 1} is already occupied by ${occupant.display_name}.`);
  }

  const effectiveName = displayName ?? me?.display_name;
  if (!effectiveName) {
    return fail(400, 'display_name_required', 'Enter a display name before taking a seat.');
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await admin
    .from('room_players')
    .upsert(
      {
        room_id: room.id,
        player_id: playerId,
        display_name: effectiveName,
        seat,
        connected: true,
        last_seen_at: now,
      },
      { onConflict: 'room_id,player_id' },
    );

  if (upsertError) {
    console.error('[rooms:sitInSeat:upsert]', upsertError);
    return fail(500, 'sit_failed', 'Could not sit in that seat right now.');
  }

  await admin.from('room_events').insert({
    room_id: room.id,
    kind: 'sit',
    player_id: playerId,
    payload: { seatIndex: seat },
  });

  return loadRoomState(room, playerId);
}

export async function leaveSeat(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = standSchema.safeParse({
    code,
    playerId: raw.playerId,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_leave_seat', parsed.error.issues[0]?.message ?? 'Invalid leave seat payload.');
  }

  const { playerId } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;

  if (room.status !== 'lobby' && room.status !== 'game_over') {
    return fail(409, 'game_in_progress', 'You can only stand up while the room is in the lobby.');
  }

  const admin = getServiceSupabase();
  const { error } = await admin
    .from('room_players')
    .update({ seat: null, last_seen_at: new Date().toISOString() })
    .match({ room_id: room.id, player_id: playerId });

  if (error) {
    console.error('[rooms:leaveSeat:update]', error);
    return fail(500, 'leave_seat_failed', 'Could not leave your seat right now.');
  }

  await admin.from('room_events').insert({
    room_id: room.id,
    kind: 'leave_seat',
    player_id: playerId,
    payload: {},
  });

  return loadRoomState(room, playerId);
}

export async function startRoom(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = startSchema.safeParse({
    code,
    playerId: raw.playerId,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_start_room', parsed.error.issues[0]?.message ?? 'Invalid start payload.');
  }

  const { playerId } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;

  if (room.host_player_id !== playerId) {
    return fail(403, 'host_only', 'Only the host can start the game.');
  }
  if (room.status !== 'lobby' && room.status !== 'game_over') {
    return fail(409, 'game_in_progress', 'This game has already started.');
  }

  const admin = getServiceSupabase();
  const { data: seatRows, error: seatError } = await admin
    .from('room_players')
    .select('player_id, display_name, seat')
    .eq('room_id', room.id)
    .not('seat', 'is', null)
    .order('seat');

  if (seatError) {
    console.error('[rooms:startRoom:seats]', seatError);
    return fail(500, 'seats_lookup_failed', 'Could not load the seated players.');
  }
  if (!seatRows || seatRows.length < 2) {
    return fail(409, 'need_at_least_2_seated', 'Need at least 2 seated players before starting.');
  }
  if (seatRows.length > 4) {
    return fail(409, 'too_many_seated', 'Only 4 seated players can join a showdown.');
  }

  const seed = (Math.random() * 2 ** 31) | 0 || 1;
  let tableState: TableState;
  try {
    tableState = startGame({
      playerIds: seatRows.map((seatRow) => seatRow.player_id),
      seed,
    });
  } catch (error) {
    console.error('[rooms:startRoom:engine]', error);
    return fail(500, 'engine_init_failed', 'Could not deal the cards for this room.');
  }

  const publicState = toPublicState(tableState, 'playing');
  const hands = toHandsMap(tableState);
  const now = new Date().toISOString();

  const [stateUpsert, roomUpdate, eventInsert] = await Promise.all([
    admin.from('room_state').upsert({
      room_id: room.id,
      full_state: tableState,
      public_state: publicState,
      hands,
      queued: {},
      tick: tableState.tick,
      updated_at: now,
    }),
    admin.from('rooms').update({ status: 'playing', updated_at: now }).eq('id', room.id),
    admin.from('room_events').insert({
      room_id: room.id,
      kind: 'start',
      player_id: playerId,
      payload: { seed },
    }),
  ]);

  if (stateUpsert.error || roomUpdate.error || eventInsert.error) {
    console.error('[rooms:startRoom:write]', {
      stateUpsert: stateUpsert.error,
      roomUpdate: roomUpdate.error,
      eventInsert: eventInsert.error,
    });
    return fail(500, 'start_failed', 'The game could not be started.');
  }

  room.status = 'playing';
  return loadRoomState(room, playerId);
}

export async function leaveRoomMembership(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<{ left: true }>> {
  const raw = input as { playerId?: string; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = leaveSchema.safeParse({
    code,
    playerId: raw.playerId,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_leave_room', parsed.error.issues[0]?.message ?? 'Invalid leave room payload.');
  }

  const { playerId } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) {
    if (roomResult.code === 'room_not_found') return ok({ left: true });
    return roomResult;
  }

  const room = roomResult.data;
  const admin = getServiceSupabase();
  await admin.from('room_players').delete().match({ room_id: room.id, player_id: playerId });

  if (room.host_player_id === playerId) {
    const { data: nextHost } = await admin
      .from('room_players')
      .select('player_id')
      .eq('room_id', room.id)
      .eq('connected', true)
      .order('joined_at')
      .limit(1)
      .maybeSingle();

    if (nextHost) {
      await Promise.all([
        admin.from('rooms').update({ host_player_id: nextHost.player_id }).eq('id', room.id),
        admin.from('room_players').update({ is_host: true }).match({
          room_id: room.id,
          player_id: nextHost.player_id,
        }),
      ]);
    } else {
      await admin.from('rooms').delete().eq('id', room.id);
    }
  }

  await admin.from('room_events').insert({
    room_id: room.id,
    kind: 'leave',
    player_id: playerId,
    payload: {},
  });

  return ok({ left: true });
}

export async function playCardsInRoom(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; cardIds?: number[]; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = playSchema.safeParse({
    code,
    playerId: raw.playerId,
    cardIds: raw.cardIds,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_play', parsed.error.issues[0]?.message ?? 'Invalid play payload.');
  }

  const { playerId, cardIds } = parsed.data;
  return mutateRoomState(code, playerId, async (state) => {
    const seat = state.players.findIndex((player) => player.id === playerId);
    if (seat < 0) return fail(409, 'not_seated', 'You must be seated to play cards.');

    const result = applyMove(state, seat, { type: 'play', cardIds });
    if (!result.ok || !result.next) {
      return fail(409, result.error ?? 'invalid_move', humanizeMoveError(result.error ?? 'invalid_move'));
    }

    return ok({
      next: result.next,
      eventKind: 'play',
      eventPayload: { cardIds },
    });
  });
}

export async function passInRoom(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = passSchema.safeParse({
    code,
    playerId: raw.playerId,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_pass', parsed.error.issues[0]?.message ?? 'Invalid pass payload.');
  }

  const { playerId } = parsed.data;
  return mutateRoomState(code, playerId, async (state) => {
    const seat = state.players.findIndex((player) => player.id === playerId);
    if (seat < 0) return fail(409, 'not_seated', 'You must be seated to pass.');

    const result = applyMove(state, seat, { type: 'pass' });
    if (!result.ok || !result.next) {
      return fail(409, result.error ?? 'invalid_move', humanizeMoveError(result.error ?? 'invalid_move'));
    }

    return ok({
      next: result.next,
      eventKind: 'pass',
      eventPayload: {},
    });
  });
}

export async function queueMoveInRoom(
  input: unknown,
  roomCodeFromPath?: string,
): Promise<RoomResult<{ room: RoomStateView; comboKind: string | null }>> {
  const raw = input as { playerId?: string; cardIds?: number[]; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = queueSchema.safeParse({
    code,
    playerId: raw.playerId,
    cardIds: raw.cardIds,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_queue_move', parsed.error.issues[0]?.message ?? 'Invalid queue payload.');
  }

  const { playerId, cardIds } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;
  const admin = getServiceSupabase();
  const { data: stateRow, error: stateError } = await admin
    .from('room_state')
    .select('full_state, queued')
    .eq('room_id', room.id)
    .maybeSingle();

  if (stateError || !stateRow?.full_state) {
    return fail(409, 'no_match_running', 'There is no active game to queue a move for.');
  }

  const state = stateRow.full_state as TableState;
  const seat = state.players.findIndex((player) => player.id === playerId);
  if (seat < 0) return fail(409, 'not_seated', 'You must be seated to queue a move.');

  if (cardIds.length === 0) {
    const queued = { ...(stateRow.queued ?? {}) } as Record<string, number[]>;
    delete queued[playerId];
    await admin.from('room_state').update({ queued }).eq('room_id', room.id);
    const roomState = await loadRoomState(room, playerId);
    if (!roomState.ok) return roomState;
    return ok({ room: roomState.data, comboKind: null });
  }

  const check = validateQueuedMove(state, seat, cardIds);
  if (!check.ok) {
    return fail(409, check.error, humanizeMoveError(check.error));
  }

  const queued = { ...(stateRow.queued ?? {}), [playerId]: cardIds };
  const { error: updateError } = await admin.from('room_state').update({ queued }).eq('room_id', room.id);
  if (updateError) {
    console.error('[rooms:queueMove:update]', updateError);
    return fail(500, 'queue_move_failed', 'Could not queue that move right now.');
  }

  const roomState = await loadRoomState(room, playerId);
  if (!roomState.ok) return roomState;
  return ok({ room: roomState.data, comboKind: check.combo.kind });
}

export async function resetRoomForReplay(input: unknown, roomCodeFromPath?: string): Promise<RoomResult<RoomStateView>> {
  const raw = input as { playerId?: string; code?: string };
  const code = roomCodeFromPath ?? raw.code ?? '';
  const parsed = playAgainSchema.safeParse({
    code,
    playerId: raw.playerId,
  });

  if (!parsed.success) {
    return fail(400, 'invalid_play_again', parsed.error.issues[0]?.message ?? 'Invalid play-again payload.');
  }

  const { playerId } = parsed.data;
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;

  if (room.host_player_id !== playerId) {
    return fail(403, 'host_only', 'Only the host can reset the room for another showdown.');
  }

  const admin = getServiceSupabase();
  const now = new Date().toISOString();
  const [stateUpdate, roomUpdate, eventInsert] = await Promise.all([
    admin.from('room_state').update({
      full_state: null,
      public_state: null,
      hands: null,
      queued: {},
      tick: 0,
      updated_at: now,
    }).eq('room_id', room.id),
    admin.from('rooms').update({ status: 'lobby', updated_at: now }).eq('id', room.id),
    admin.from('room_events').insert({
      room_id: room.id,
      kind: 'play_again',
      player_id: playerId,
      payload: {},
    }),
  ]);

  if (stateUpdate.error || roomUpdate.error || eventInsert.error) {
    console.error('[rooms:resetRoomForReplay]', {
      stateUpdate: stateUpdate.error,
      roomUpdate: roomUpdate.error,
      eventInsert: eventInsert.error,
    });
    return fail(500, 'play_again_failed', 'Could not reset the room for another showdown.');
  }

  room.status = 'lobby';
  return loadRoomState(room, playerId);
}

type MutateOutcome = RoomResult<{
  next: TableState;
  eventKind: string;
  eventPayload: Record<string, unknown>;
}>;

async function mutateRoomState(
  code: string,
  playerId: string,
  fn: (state: TableState) => Promise<MutateOutcome>,
): Promise<RoomResult<RoomStateView>> {
  const roomResult = await getRoomByCode(code);
  if (!roomResult.ok) return roomResult;
  const room = roomResult.data;
  const admin = getServiceSupabase();
  const { data: stateRow, error: stateError } = await admin
    .from('room_state')
    .select('full_state, queued')
    .eq('room_id', room.id)
    .maybeSingle();

  if (stateError || !stateRow?.full_state) {
    return fail(409, 'no_match_running', 'There is no active game running in this room.');
  }

  const state = stateRow.full_state as TableState;
  const nextStateResult = await fn(state);
  if (!nextStateResult.ok) return nextStateResult;

  const { next, eventKind, eventPayload } = nextStateResult.data;
  const isGameOver = next.finishingOrder.length >= next.players.length - 1;
  const status = isGameOver ? 'game_over' : 'playing';
  const publicState = toPublicState(next, status);
  const hands = toHandsMap(next);
  const queued = stableQueued((stateRow.queued ?? {}) as Record<string, number[]>, hands);
  const now = new Date().toISOString();

  const [stateUpdate, roomUpdate, eventInsert] = await Promise.all([
    admin.from('room_state').update({
      full_state: next,
      public_state: publicState,
      hands,
      queued,
      tick: next.tick,
      updated_at: now,
    }).eq('room_id', room.id),
    admin.from('rooms').update({ status, updated_at: now }).eq('id', room.id),
    admin.from('room_events').insert({
      room_id: room.id,
      kind: isGameOver ? 'game_over' : eventKind,
      player_id: playerId,
      payload: isGameOver ? { finishingOrder: next.finishingOrder } : eventPayload,
    }),
  ]);

  if (stateUpdate.error || roomUpdate.error || eventInsert.error) {
    console.error('[rooms:mutateRoomState]', {
      stateUpdate: stateUpdate.error,
      roomUpdate: roomUpdate.error,
      eventInsert: eventInsert.error,
    });
    return fail(500, 'room_update_failed', 'The room state could not be updated.');
  }

  room.status = status;
  return loadRoomState(room, playerId);
}

function stableQueued(
  queued: Record<string, number[]>,
  hands: Record<string, { id: number }[]>,
): Record<string, number[]> {
  const next: Record<string, number[]> = {};
  for (const [playerId, ids] of Object.entries(queued)) {
    const owned = new Set(hands[playerId]?.map((card) => card.id) ?? []);
    if (ids.every((id) => owned.has(id))) next[playerId] = ids;
  }
  return next;
}

function humanizeMoveError(code: string): string {
  const messages: Record<string, string> = {
    not_your_turn: 'It is not your turn.',
    already_finished: 'You already finished this hand.',
    cannot_pass_on_lead: 'You cannot pass when you are leading the trick.',
    invalid_combo: 'That card selection is not a valid Tiến Lên combo.',
    first_play_must_contain_first_card: 'The opening play must include the lowest dealt card.',
    invalid_lead: 'That is not a valid opening play.',
    does_not_beat_current: 'That play does not beat the current combo.',
    invalid_move: 'That move is not valid right now.',
  };

  return messages[code] ?? code.replace(/_/g, ' ');
}
