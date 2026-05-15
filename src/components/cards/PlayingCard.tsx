'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Card } from '@/game/rules/types';

const SUIT_GLYPH: Record<Card['suit'], string> = { S: '♠', C: '♣', D: '♦', H: '♥' };
const RANK_LABEL: Record<Card['rank'], string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A', '2': '2',
};

export function PlayingCard({
  card,
  selected = false,
  faceDown = false,
  onClick,
  size = 'md',
  glow,
}: {
  card?: Card;
  selected?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: 'blue' | 'gold' | 'pink' | null;
}) {
  const dim =
    size === 'lg' ? 'h-24 w-16 md:h-28 md:w-20'
    : size === 'sm' ? 'h-12 w-9 md:h-14 md:w-10'
    : size === 'xs' ? 'h-11 w-8 md:h-12 md:w-9'
    : 'h-16 w-11 md:h-20 md:w-14';

  if (faceDown || !card) {
    return <div className={cn('card-back rounded-lg', dim)} />;
  }

  const red = card.suit === 'D' || card.suit === 'H';
  const glowClass =
    glow === 'gold'  ? 'shadow-neonGold ring-1 ring-ko-gold/70' :
    glow === 'pink'  ? 'shadow-neonPink ring-1 ring-ko-pink/70' :
    glow === 'blue'  ? 'shadow-neon    ring-1 ring-ko-blue/70' :
    selected         ? 'shadow-neonGold ring-2 ring-ko-gold' : '';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -8, transition: { duration: 0.15 } }}
      animate={{ y: selected ? -16 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      aria-pressed={selected}
      aria-label={`${RANK_LABEL[card.rank]} of ${card.suit}`}
      className={cn(
        'card-face relative rounded-lg flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ko-gold',
        dim, glowClass,
      )}
    >
      <CornerLabel rank={RANK_LABEL[card.rank]} suit={SUIT_GLYPH[card.suit]} red={red} />
      <div className={cn('absolute inset-0 grid place-items-center select-none text-2xl md:text-3xl', red ? 'text-red-700' : 'text-black')}>
        {SUIT_GLYPH[card.suit]}
      </div>
      <CornerLabel rank={RANK_LABEL[card.rank]} suit={SUIT_GLYPH[card.suit]} red={red} rotated />
    </motion.button>
  );
}

function CornerLabel({ rank, suit, red, rotated }: { rank: string; suit: string; red: boolean; rotated?: boolean }) {
  return (
    <div
      className={cn(
        'absolute font-bold leading-none text-[9px] md:text-[10px]',
        rotated ? 'bottom-1 right-1 rotate-180' : 'top-1 left-1',
        red ? 'text-red-700' : 'text-black',
      )}
    >
      <div>{rank}</div>
      <div>{suit}</div>
    </div>
  );
}
