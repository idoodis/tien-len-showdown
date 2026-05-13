'use client';

import { cn } from '@/lib/utils';

interface SeatRow {
  player_id: string;
  display_name: string;
  seat: number | null;
  is_host: boolean;
}

export function SeatPicker({
  players,
  myPlayerId,
  onSit,
  onStand,
  busy,
}: {
  players: SeatRow[];
  myPlayerId: string;
  onSit: (seat: number) => void;
  onStand: () => void;
  busy: boolean;
}) {
  const mySeat = players.find((p) => p.player_id === myPlayerId)?.seat ?? null;
  const seats = [0, 1, 2, 3].map((idx) => {
    const occupant = players.find((p) => p.seat === idx);
    return { idx, occupant };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display tracking-widest text-lg">SEATS</h3>
        {mySeat !== null && (
          <button onClick={onStand} disabled={busy} className="btn-ghost text-[10px]">Stand up</button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {seats.map(({ idx, occupant }) => {
          const isMine = occupant?.player_id === myPlayerId;
          const empty = !occupant;
          return (
            <button
              key={idx}
              onClick={() => !occupant && onSit(idx)}
              disabled={busy || !!occupant}
              className={cn(
                'rounded-md p-3 text-left transition',
                empty
                  ? 'panel border-dashed border-white/20 hover:border-ko-blue/50 hover:bg-ko-blue/5 cursor-pointer'
                  : 'panel border-ko-gold/40',
                isMine && 'shadow-neonGold ring-1 ring-ko-gold/60',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Seat {idx + 1}</span>
                {occupant?.is_host && <span className="text-ko-gold text-xs">★ host</span>}
              </div>
              <div className="mt-1 font-display tracking-widest text-lg">
                {occupant ? occupant.display_name.toUpperCase() : <span className="text-white/30">EMPTY</span>}
              </div>
              {isMine && <div className="text-[10px] uppercase text-ko-blue tracking-widest">you</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
