'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PlayingCard } from '@/components/cards/PlayingCard';

type Position = 'top' | 'left' | 'right' | 'bottom';

export function PlayerSeat({
  name,
  cardCount,
  isActive,
  finishedAt,
  isHost,
  isYou,
  position,
}: {
  name: string;
  cardCount: number;
  isActive: boolean;
  finishedAt: number | null;
  isHost: boolean;
  isYou: boolean;
  position: Position;
}) {
  const wrap =
    position === 'top'    ? 'absolute top-3 left-1/2 -translate-x-1/2 flex-col items-center'
  : position === 'left'   ? 'absolute left-3 top-1/2 -translate-y-1/2 flex-col items-start'
  : position === 'right'  ? 'absolute right-3 top-1/2 -translate-y-1/2 flex-col items-end'
                          : 'absolute bottom-3 left-1/2 -translate-x-1/2 flex-col items-center';

  const orient = position === 'left' || position === 'right' ? 'flex-col' : 'flex-col';

  return (
    <motion.div
      layout
      className={cn('flex gap-2', wrap, orient)}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 panel text-sm',
          isActive ? 'seat-active animate-haloPulse' : '',
          finishedAt !== null ? 'opacity-50' : '',
        )}
      >
        {isHost && <span className="text-ko-gold text-xs">★</span>}
        <span className="font-display text-base tracking-wider text-white">{name}</span>
        {isYou && <span className="rounded-full bg-ko-blue/20 px-2 text-[10px] text-ko-blue">YOU</span>}
        {finishedAt !== null && (
          <span className="text-ko-gold text-[10px] font-mono">#{finishedAt + 1}</span>
        )}
      </div>
      <div className="flex -space-x-3">
        {Array.from({ length: Math.min(cardCount, 8) }).map((_, i) => (
          <PlayingCard key={i} faceDown size="sm" />
        ))}
        {cardCount > 8 && (
          <span className="ml-2 font-mono text-xs text-white/60">+{cardCount - 8}</span>
        )}
        {cardCount === 0 && finishedAt === null && (
          <span className="font-mono text-xs text-white/30">empty</span>
        )}
      </div>
    </motion.div>
  );
}
