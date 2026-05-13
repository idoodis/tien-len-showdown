'use client';

import { useState } from 'react';
import { getLeaderIds } from '@/features/room/scoreboard';
import type { RoomPlayerView } from '@/features/room/types';
import { cn } from '@/lib/utils';

export function SeatPicker({
  players,
  myPlayerId,
  onSit,
  onStand,
  onSeatBlocked,
  busy,
}: {
  players: RoomPlayerView[];
  myPlayerId: string;
  onSit: (seatIndex: number) => void;
  onStand: () => void;
  onSeatBlocked: (message: string) => void;
  busy: boolean;
}) {
  const [pendingSeat, setPendingSeat] = useState<number | null>(null);
  const mySeat = players.find((player) => player.playerId === myPlayerId)?.seatIndex ?? null;
  const leaderIds = new Set(getLeaderIds(players));
  const seats = [0, 1, 2, 3].map((seatIndex) => ({
    seatIndex,
    occupant: players.find((player) => player.seatIndex === seatIndex) ?? null,
  }));

  if (!busy && pendingSeat !== null) {
    queueMicrotask(() => setPendingSeat(null));
  }

  const clickSeat = (seatIndex: number, occupant: RoomPlayerView | null) => {
    if (busy) return;
    if (occupant?.playerId === myPlayerId) {
      onSeatBlocked(`You are already sitting in seat ${seatIndex + 1}.`);
      return;
    }
    if (occupant) {
      onSeatBlocked(`${occupant.displayName} is already sitting in seat ${seatIndex + 1}.`);
      return;
    }

    setPendingSeat(seatIndex);
    onSit(seatIndex);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg tracking-widest">SEATS</h3>
        {mySeat !== null && (
          <button onClick={onStand} disabled={busy} className="btn-ghost text-[10px]">
            Stand up
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {seats.map(({ seatIndex, occupant }) => {
          const isMine = occupant?.playerId === myPlayerId;
          const pending = pendingSeat === seatIndex;
          const empty = !occupant;
          return (
            <button
              key={seatIndex}
              type="button"
              onClick={() => clickSeat(seatIndex, occupant)}
              disabled={busy}
              aria-label={empty ? `Sit in seat ${seatIndex + 1}` : `Seat ${seatIndex + 1} taken by ${occupant.displayName}`}
              className={cn(
                'relative rounded-md p-3 text-left transition',
                empty
                  ? 'panel border-dashed border-white/20 hover:border-ko-blue/50 hover:bg-ko-blue/5'
                  : 'panel border-ko-gold/40',
                empty && !busy && 'cursor-pointer',
                occupant && !isMine && 'hover:border-ko-red/50',
                isMine && 'shadow-neonGold ring-1 ring-ko-gold/60',
                pending && 'animate-pulse ring-1 ring-ko-blue/60',
              )}
              title={occupant && !isMine ? `${occupant.displayName} already has this seat.` : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Seat {seatIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                  {occupant && leaderIds.has(occupant.playerId) && (
                    <span className="rounded-full border border-ko-blue/30 bg-ko-blue/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-ko-blue">
                      crown
                    </span>
                  )}
                  {occupant?.isHost && <span className="text-xs text-ko-gold">★ host</span>}
                </div>
              </div>
              <div className="mt-1 font-display text-lg tracking-widest">
                {occupant
                  ? occupant.displayName.toUpperCase()
                  : <span className="text-white/40">{pending ? 'SITTING...' : 'EMPTY'}</span>}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">
                {occupant ? `Wins: ${occupant.wins}` : 'Wins: 0'}
              </div>
              {isMine && <div className="text-[10px] uppercase tracking-widest text-ko-blue">you</div>}
              {occupant && !isMine && <div className="text-[10px] uppercase tracking-widest text-white/35">occupied</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
