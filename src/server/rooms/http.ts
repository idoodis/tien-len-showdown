import { NextResponse } from 'next/server';
import type { ApiError, ApiSuccess } from '@/features/room/types';

export function toRouteResponse<T>(result: ApiSuccess<T> | (ApiError & { status?: number })) {
  if (result.ok) {
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      code: result.code,
    },
    { status: result.status ?? 400 },
  );
}
