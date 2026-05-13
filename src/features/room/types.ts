import type { Card } from '@/game/rules/types';
import type { PublicState } from '@/game/state/projection';

export interface RoomPlayerView {
  playerId: string;
  displayName: string;
  seatIndex: number | null;
  seat: number | null;
  isHost: boolean;
  connected: boolean;
  wins: number;
}

export interface RoomStateView {
  room: {
    id: string;
    code: string;
    status: string;
    hostPlayerId: string | null;
    publicState: PublicState | null;
  };
  players: RoomPlayerView[];
  seats: Array<RoomPlayerView | null>;
  publicState: PublicState | null;
  yourHand: Card[] | null;
  yourQueued: number[] | null;
  tick: number;
  isMember: boolean;
}

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: string;
  code: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
