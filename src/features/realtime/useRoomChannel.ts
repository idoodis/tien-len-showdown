'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchRoomState } from '@/features/room/api';
import type { RoomStateView } from '@/features/room/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { debugLog } from '@/lib/debug';

interface Hook {
  data: RoomStateView | null;
  refresh: () => Promise<void>;
  lastEvent: { kind: string; createdAt: string; payload: Record<string, unknown>; playerId: string | null } | null;
}

export function useRoomChannel({
  code,
  playerId,
}: {
  code: string;
  playerId: string;
}): Hook {
  const [data, setData] = useState<RoomStateView | null>(null);
  const [lastEvent, setLastEvent] = useState<Hook['lastEvent']>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const lastTick = useRef<number>(-1);

  const refresh = async () => {
    if (!playerId) return;
    if (inflight.current) return inflight.current;

    inflight.current = (async () => {
      try {
        const result = await fetchRoomState(code, playerId);
        if (!result.ok) {
          debugLog('room:refresh:error', result);
          return;
        }

        setData((previous) => {
          if (!previous) {
            lastTick.current = result.data.tick;
            return result.data;
          }

          if (result.data.tick === lastTick.current) {
            return {
              ...previous,
              ...result.data,
            };
          }

          lastTick.current = result.data.tick;
          return result.data;
        });
      } finally {
        inflight.current = null;
      }
    })();

    return inflight.current;
  };

  useEffect(() => {
    if (!code || !playerId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId]);

  useEffect(() => {
    if (!code || !playerId || !data?.room.id) return;

    let stopped = false;
    const supabase = getBrowserSupabase();
    const roomId = data.room.id;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          if (stopped) return;
          debugLog('room:realtime', 'room_players change', roomId);
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_events',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (stopped) return;
          const row = payload.new as {
            kind: string;
            created_at: string;
            payload: Record<string, unknown>;
            player_id: string | null;
          };
          debugLog('room:realtime', 'room_event', row);
          setLastEvent({
            kind: row.kind,
            createdAt: row.created_at,
            payload: row.payload,
            playerId: row.player_id,
          });
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        () => {
          if (stopped) return;
          debugLog('room:realtime', 'room updated', roomId);
          void refresh();
        },
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void refresh();
    }, 1500);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId, data?.room.id]);

  return { data, refresh, lastEvent };
}
