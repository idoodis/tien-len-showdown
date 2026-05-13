'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Card } from '@/game/rules/types';
import type { PublicState } from '@/game/state/projection';

export interface RoomPlayer {
  player_id: string;
  display_name: string;
  seat: number | null;
  is_host: boolean;
  connected: boolean;
}

export interface RoomFetchResult {
  ok: true;
  room: { code: string; status: string; hostPlayerId: string | null };
  players: RoomPlayer[];
  publicState: PublicState | null;
  yourHand: Card[] | null;
  yourQueued: number[] | null;
  tick: number;
  isMember: boolean;
}

interface Hook {
  data: RoomFetchResult | null;
  refresh: () => Promise<void>;
  /** Last event observed — useful for animation triggers. */
  lastEvent: { kind: string; createdAt: string; payload: Record<string, unknown>; playerId: string | null } | null;
}

/**
 * Subscribes to a room's Supabase Realtime channels. On every relevant change
 * (player joined/left, event written), re-fetches the secure /api/room state.
 * Falls back to a short polling cadence for safety in case a Realtime event
 * is missed.
 */
export function useRoomChannel({
  code,
  playerId,
}: {
  code: string;
  playerId: string;
}): Hook {
  const [data, setData] = useState<RoomFetchResult | null>(null);
  const [lastEvent, setLastEvent] = useState<Hook['lastEvent']>(null);
  const lastTick = useRef<number>(-1);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = async () => {
    if (!playerId) return;
    if (inflight.current) return inflight.current;
    const url = `/api/room/${code}/state?playerId=${encodeURIComponent(playerId)}&t=${Date.now()}`;
    inflight.current = (async () => {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) return;
        const json = (await r.json()) as RoomFetchResult;
        // Always update player list / hand; dedupe publicState by tick.
        setData((prev) => {
          if (!prev) return json;
          if (json.tick === lastTick.current) {
            return { ...prev, players: json.players, yourHand: json.yourHand, yourQueued: json.yourQueued, room: json.room, isMember: json.isMember };
          }
          lastTick.current = json.tick;
          return json;
        });
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  };

  useEffect(() => {
    if (!code || !playerId) return;
    let stopped = false;
    refresh();

    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`room:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        () => { if (!stopped) refresh(); },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_events' },
        (payload) => {
          if (stopped) return;
          const row = payload.new as { kind: string; created_at: string; payload: Record<string, unknown>; player_id: string | null; room_id: string };
          setLastEvent({ kind: row.kind, createdAt: row.created_at, payload: row.payload, playerId: row.player_id });
          refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms' },
        () => { if (!stopped) refresh(); },
      )
      .subscribe();

    // Safety-net poll every 4s in case a Realtime event is dropped.
    const interval = setInterval(refresh, 4000);

    return () => {
      stopped = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId]);

  return { data, refresh, lastEvent };
}
