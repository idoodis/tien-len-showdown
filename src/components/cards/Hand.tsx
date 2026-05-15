'use client';

import { PlayingCard } from './PlayingCard';
import type { Card } from '@/game/rules/types';

export function Hand({
  cards,
  selectedIds,
  onToggle,
  highlight,
}: {
  cards: Card[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  highlight?: 'blue' | 'gold' | 'pink' | null;
}) {
  const n = cards.length;
  const cardSize = n > 11 ? 'xs' : n > 8 ? 'sm' : 'md';
  const spread = n > 11 ? 1.8 : n > 8 ? 2.1 : 2.4;
  return (
    <div className="relative flex justify-center pt-6 md:pt-12">
      <div className="flex -space-x-5 md:-space-x-7">
        {cards.map((c, i) => {
          const angle = (i - (n - 1) / 2) * spread;
          return (
            <div
              key={c.id}
              className="origin-bottom"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <PlayingCard
                card={c}
                size={cardSize}
                selected={selectedIds.has(c.id)}
                onClick={() => onToggle(c.id)}
                glow={selectedIds.has(c.id) ? highlight ?? 'gold' : null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
