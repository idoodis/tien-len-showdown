'use client';

import { motion } from 'framer-motion';
import { buildScoreboard } from '@/features/room/scoreboard';
import type { RoomPlayerView } from '@/features/room/types';
import { cn } from '@/lib/utils';

export function RoomScoreboard({
  players,
  myPlayerId,
  winnerPlayerId,
  compact = false,
}: {
  players: RoomPlayerView[];
  myPlayerId: string;
  winnerPlayerId?: string | null;
  compact?: boolean;
}) {
  const entries = buildScoreboard(players, winnerPlayerId ?? null);

  if (entries.length === 0) return null;

  return (
    <div className="panel overflow-hidden rounded-2xl border border-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-ko-blue/80">
            Room Scoreboard
          </p>
          <h3 className="font-display text-lg tracking-[0.24em] text-white">
            WIN TRACKER
          </h3>
        </div>
        <div className="rounded-full border border-ko-gold/30 bg-ko-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.35em] text-ko-gold">
          Room only
        </div>
      </div>

      <div className={cn('grid gap-3 p-3', compact ? 'md:grid-cols-2' : 'md:grid-cols-4')}>
        {entries.map((entry, index) => (
          <motion.div
            key={entry.playerId}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              'relative overflow-hidden rounded-2xl border px-4 py-3',
              entry.isWinner
                ? 'border-ko-gold/60 bg-gradient-to-br from-ko-gold/18 via-white/[0.07] to-ko-red/10 shadow-neonGold'
                : entry.isLeader
                  ? 'border-ko-blue/45 bg-gradient-to-br from-ko-blue/14 via-white/[0.04] to-transparent shadow-neon'
                  : 'border-white/10 bg-white/[0.03]',
              entry.playerId === myPlayerId && 'ring-1 ring-ko-blue/50',
            )}
          >
            <div className="absolute inset-y-0 right-0 w-24 -skew-x-[26deg] bg-gradient-to-l from-white/10 to-transparent" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base tracking-[0.16em] text-white">
                    {entry.displayName.toUpperCase()}
                  </span>
                  {entry.playerId === myPlayerId && (
                    <span className="rounded-full bg-ko-blue/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ko-blue">
                      You
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">
                  {entry.seatLabel}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {entry.isLeader && (
                  <span className="rounded-full border border-ko-gold/30 bg-ko-gold/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ko-gold">
                    Crown
                  </span>
                )}
                {entry.isWinner && (
                  <span className="rounded-full border border-ko-red/40 bg-ko-red/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ko-red">
                    Winner
                  </span>
                )}
              </div>
            </div>

            <div className="relative mt-4 flex items-end justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
                Room wins
              </div>
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl leading-none text-white">{entry.wins}</span>
                <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
                  wins
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
