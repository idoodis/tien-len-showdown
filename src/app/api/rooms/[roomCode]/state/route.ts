import { fetchRoomState } from '@/server/rooms/service';
import { toRouteResponse } from '@/server/rooms/http';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { roomCode: string } },
) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get('playerId') ?? undefined;
  return toRouteResponse(await fetchRoomState(params.roomCode, playerId));
}
