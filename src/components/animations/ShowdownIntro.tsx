'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAnimationLevel } from '@/features/settings/useSettings';

/** READY? → SHOWDOWN! intro that fires when the host kicks off the game. */
export function ShowdownIntro({ trigger }: { trigger: number }) {
  const level = useAnimationLevel();
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0 hidden, 1 READY, 2 SHOWDOWN

  useEffect(() => {
    if (!trigger || level === 'minimal') return;
    setPhase(1);
    const a = setTimeout(() => setPhase(2), 700);
    const b = setTimeout(() => setPhase(0), 1500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [trigger, level]);

  return (
    <AnimatePresence>
      {phase !== 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-arena-0/85" />
          <div className="absolute inset-0 speed-lines animate-speedLines" />
          <motion.h1
            key={phase}
            initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className={`relative font-display tracking-[0.04em] leading-none ${
              phase === 1 ? 'text-ko-gold neon-text' : 'text-ko-pink neon-pink'
            }`}
            style={{
              fontSize: 'min(18vw, 220px)',
              WebkitTextStroke: '3px rgba(255,255,255,0.18)',
              textShadow:
                phase === 1
                  ? '0 0 18px rgba(255,216,74,0.55), 0 0 60px rgba(255,216,74,0.35)'
                  : '0 0 18px rgba(255,90,217,0.55), 0 0 60px rgba(255,90,217,0.35)',
            }}
          >
            {phase === 1 ? 'READY?' : 'SHOWDOWN!'}
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
