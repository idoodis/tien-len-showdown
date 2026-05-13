import type { ApiResponse, RoomStateView } from '@/features/room/types';
import { debugLog } from '@/lib/debug';

interface CreateRoomInput {
  playerId: string;
  displayName: string;
}

interface JoinRoomInput {
  roomCode: string;
  playerId: string;
  displayName: string;
}

interface SitRoomInput {
  roomCode: string;
  playerId: string;
  displayName: string;
  seatIndex: number;
}

interface LeaveSeatInput {
  roomCode: string;
  playerId: string;
}

interface LeaveRoomInput {
  roomCode: string;
  playerId: string;
}

interface StartRoomInput {
  roomCode: string;
  playerId: string;
}

interface PlayCardsInput {
  roomCode: string;
  playerId: string;
  cardIds: number[];
}

interface PassTurnInput {
  roomCode: string;
  playerId: string;
}

interface QueueMoveInput {
  roomCode: string;
  playerId: string;
  cardIds: number[];
}

interface PlayAgainInput {
  roomCode: string;
  playerId: string;
}

interface CreateRoomData {
  roomCode: string;
  room: RoomStateView;
}

interface QueueMoveData {
  room: RoomStateView;
  comboKind: string | null;
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  label: string,
): Promise<ApiResponse<T>> {
  debugLog('api:request', label, { url, init });

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    debugLog('api:error', label, error);
    return {
      ok: false,
      code: 'network_error',
      error: 'Network request failed. Please try again.',
    };
  }

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    debugLog('api:parse-error', label, error);
    return {
      ok: false,
      code: 'invalid_response',
      error: 'The server returned an invalid response.',
    };
  }

  debugLog('api:response', label, { status: response.status, json });
  return json;
}

export function createRoom(input: CreateRoomInput) {
  return requestJson<CreateRoomData>(
    '/api/rooms/create',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'create-room',
  );
}

export function joinRoom(input: JoinRoomInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/join`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: input.playerId,
        displayName: input.displayName,
      }),
    },
    'join-room',
  );
}

export function sitInRoom(input: SitRoomInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/sit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: input.playerId,
        displayName: input.displayName,
        seatIndex: input.seatIndex,
      }),
    },
    'sit-room',
  );
}

export function leaveSeat(input: LeaveSeatInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/leave-seat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: input.playerId }),
    },
    'leave-seat',
  );
}

export function leaveRoom(input: LeaveRoomInput) {
  return requestJson<{ left: true }>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/leave`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: input.playerId }),
    },
    'leave-room',
  );
}

export function startRoom(input: StartRoomInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/start`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: input.playerId }),
    },
    'start-room',
  );
}

export function playCards(input: PlayCardsInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/play`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: input.playerId,
        cardIds: input.cardIds,
      }),
    },
    'play-cards',
  );
}

export function passTurn(input: PassTurnInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/pass`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: input.playerId }),
    },
    'pass-turn',
  );
}

export function queueMove(input: QueueMoveInput) {
  return requestJson<QueueMoveData>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/queue`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: input.playerId,
        cardIds: input.cardIds,
      }),
    },
    'queue-move',
  );
}

export function playAgain(input: PlayAgainInput) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(input.roomCode)}/play-again`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: input.playerId }),
    },
    'play-again',
  );
}

export function fetchRoomState(roomCode: string, playerId: string) {
  return requestJson<RoomStateView>(
    `/api/rooms/${encodeURIComponent(roomCode)}/state?playerId=${encodeURIComponent(playerId)}&t=${Date.now()}`,
    { method: 'GET', cache: 'no-store' },
    'fetch-room-state',
  );
}
