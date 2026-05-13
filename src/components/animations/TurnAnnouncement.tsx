'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useAnimationLevel } from '@/features/settings/useSettings';

export function TurnAnnouncement({
  show,
  who,
  isYou,
}: {
  show: boolean;
  who: string;
  isYou: boolean;
}) {
  const level = useAnimationLevel();
  if (level === 'minimal') return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop dim + flash */}
          <div className="absolute inset-0 bg-arena-0/70" />
          <div className="absolute inset-0 animate-flashPulse bg-ko-blue/30 mix-blend-screen" />

          {/* Diagonal speed lines */}
          <div className="absolute inset-0 speed-lines animate-speedLines" />

          {/* Diagonal accent slash */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-40 -skew-y-6 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 w-full animate-sweep ${
                isYou ? 'bg-gradient-to-r from-transparent via-ko-blue to-transparent' : 'bg-gradient-to-r from-transparent via-ko-red to-transparent'
              }`}
              style={{ opacity: 0.45 }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-1 text-center">
            <motion.p
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.18 }}
              className="font-mono text-xs uppercase tracking-[0.6em] text-white/70"
            >
              {isYou ? 'PLAYER 1' : 'OPPONENT'}
            </motion.p>
            <motion.h2
              initial={{ x: -120, opacity: 0, skewX: -12 }}
              animate={{ x: 0, opacity: 1, skewX: -12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className={`font-display tracking-[0.04em] leading-none text-[14vw] md:text-[10vw] ${
                isYou ? 'neon-text' : 'neon-pink'
              }`}
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.15)' }}
            >
              {isYou ? 'YOUR TURN' : `${who.toUpperCase()}'S TURN`}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/60"
            >
              {isYou ? 'play or pass' : 'queue your move'}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
