import { RoomClient } from '@/features/room/RoomClient';

export const dynamic = 'force-dynamic';

export default function RoomPage({ params }: { params: { code: string } }) {
  return <RoomClient code={params.code.toUpperCase()} />;
}
