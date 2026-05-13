import { leaveRoomMembership } from '@/server/rooms/service';
import { toRouteResponse } from '@/server/rooms/http';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { roomCode: string } },
) {
  const body = await request.json();
  return toRouteResponse(await leaveRoomMembership(body, params.roomCode));
}
