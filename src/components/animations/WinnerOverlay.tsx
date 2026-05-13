'use client';

import { motion } from 'framer-motion';
import { useAnimationLevel } from '@/features/settings/useSettings';

export function WinnerOverlay({
  winnerName,
  isYou,
  onPlayAgain,
  canPlayAgain,
}: {
  winnerName: string;
  isYou: boolean;
  onPlayAgain: () => void;
  canPlayAgain: boolean;
}) {
  const level = useAnimationLevel();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-arena-0/85 backdrop-blur"
    >
      {level !== 'minimal' && (
        <>
          <div className="absolute inset-0 speed-lines animate-speedLines" />
          {[...Array(level === 'full' ? 22 : 8)].map((_, i) => (
            <Particle key={i} delay={i * 0.05} />
          ))}
        </>
      )}

      <motion.p
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative font-mono text-xs uppercase tracking-[0.6em] text-ko-blue"
      >
        match concluded
      </motion.p>
      <motion.h2
        initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 12 }}
        className="relative font-display leading-none text-ko-gold neon-text"
        style={{ fontSize: 'min(20vw, 220px)', WebkitTextStroke: '3px rgba(255,255,255,0.18)' }}
      >
        K.O.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative font-display text-4xl md:text-6xl tracking-[0.1em] text-white neon-pink"
      >
        {winnerName.toUpperCase()} WINS
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative font-mono text-xs uppercase tracking-[0.4em] text-white/60"
      >
        {isYou ? 'flawless, champion.' : 'better luck next round.'}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="relative pt-2"
      >
        <button
          onClick={onPlayAgain}
          disabled={!canPlayAgain}
          className="btn-primary text-base"
          title={canPlayAgain ? '' : 'Only the host can start the next match'}
        >
          {canPlayAgain ? 'PLAY AGAIN' : 'WAITING FOR HOST…'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function Particle({ delay }: { delay: number }) {
  const left = Math.random() * 100;
  const dx = (Math.random() - 0.5) * 60;
  const color = ['#ffd84a', '#4ad9ff', '#ff5ad9', '#a25bff'][Math.floor(Math.random() * 4)];
  return (
    <motion.div
      initial={{ y: 200, x: 0, opacity: 0 }}
      animate={{ y: -400, x: dx, opacity: [0, 1, 1, 0] }}
      transition={{ delay, duration: 2.4, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.3 }}
      className="absolute h-2 w-2 rounded-full"
      style={{ left: `${left}%`, top: '60%', background: color, boxShadow: `0 0 12px ${color}` }}
    />
  );
}
