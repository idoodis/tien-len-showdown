'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { PlayingCard } from './PlayingCard';
import type { Combo } from '@/game/rules/types';

export function PlayedPile({ combo, controllerName }: { combo: Combo | null; controllerName: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
        {combo ? `${combo.kind.replace('-', ' ')} · ${controllerName ?? 'controller'}` : 'open trick'}
      </div>
      <div className="relative flex min-h-[120px] items-center gap-1">
        <AnimatePresence mode="popLayout">
          {combo ? (
            combo.cards.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ y: -60, opacity: 0, rotate: -20 + i * 6 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, y: 30, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 240, damping: 18, delay: i * 0.05 }}
              >
                <PlayingCard card={c} glow="blue" />
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              className="font-display text-2xl tracking-[0.5em] text-white/40"
            >
              LEAD
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
