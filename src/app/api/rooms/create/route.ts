import { createRoom } from '@/server/rooms/service';
import { toRouteResponse } from '@/server/rooms/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  return toRouteResponse(await createRoom(body));
}
