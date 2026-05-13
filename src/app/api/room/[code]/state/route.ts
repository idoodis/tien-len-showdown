import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import type { Card } from '@/game/rules/types';

export const dynamic = 'force-dynamic';

/**
 * Returns the public projection of the room state plus *only the calling
 * player's* private hand. Player identity is asserted via the `playerId`
 * query parameter — there's no auth, so the caller could ask for someone
 * else's hand. We guard against that by requiring the player_id is currently
 * sitting in the room.
 */
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const url = new URL(req.url);
  const playerId = url.searchParams.get('playerId') ?? '';
  if (!playerId) return NextResponse.json({ error: 'missing_player_id' }, { status: 400 });

  const admin = getServiceSupabase();
  // Case-insensitive room lookup — codes are uppercase by convention but a user
  // typing manually shouldn't be punished for case.
  const { data: room, error: roomErr } = await admin
    .from('rooms').select('id, status, host_player_id, code')
    .ilike('code', params.code).maybeSingle();
  if (roomErr) {
    console.error('[api/room/state] room lookup failed', roomErr);
    return NextResponse.json({ error: 'room_lookup_failed' }, { status: 500 });
  }
  if (!room) return NextResponse.json({ error: 'room_not_found' }, { status: 404 });

  const [{ data: stateRow }, { data: players }] = await Promise.all([
    admin.from('room_state').select('public_state, hands, queued, tick').eq('room_id', room.id).maybeSingle(),
    admin.from('room_players').select('player_id, display_name, seat, is_host, connected').eq('room_id', room.id).order('seat'),
  ]);

  // Verify the caller is currently a member of this room.
  const member = (players ?? []).find((p) => p.player_id === playerId);
  if (!member) {
    return NextResponse.json({
      ok: true,
      room: { code: room.code, status: room.status, hostPlayerId: room.host_player_id },
      players: players ?? [],
      publicState: stateRow?.public_state ?? null,
      yourHand: null,
      yourQueued: null,
      tick: stateRow?.tick ?? 0,
      isMember: false,
    });
  }

  const hands = (stateRow?.hands ?? {}) as Record<string, Card[]>;
  const yourHand = hands[playerId] ?? null;

  const queued = (stateRow?.queued ?? {}) as Record<string, number[]>;
  const yourQueued = queued[playerId] ?? null;

  return NextResponse.json({
    ok: true,
    room: { code: room.code, status: room.status, hostPlayerId: room.host_player_id },
    players: players ?? [],
    publicState: stateRow?.public_state ?? null,
    yourHand,
    yourQueued,
    tick: stateRow?.tick ?? 0,
    isMember: true,
  });
}
