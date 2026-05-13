'use client';

import { motion } from 'framer-motion';
import { useAnimationLevel } from '@/features/settings/useSettings';

export function WinnerOverlay({
  winnerName,
  winnerWins,
  isYou,
  canPlayAgain,
  onPlayAgain,
}: {
  winnerName: string;
  winnerWins: number;
  isYou: boolean;
  canPlayAgain: boolean;
  onPlayAgain: () => void;
}) {
  const level = useAnimationLevel();
  const dramatic = level === 'full';
  const reduced = level === 'reduced';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 overflow-hidden bg-[#04030a]/84 backdrop-blur-[6px]"
    >
      <motion.div
        initial={dramatic ? { scale: 0.9, opacity: 0.7 } : { opacity: 0.85 }}
        animate={dramatic ? { scale: [0.9, 1.03, 1], opacity: [0.7, 1, 1] } : { opacity: 1 }}
        transition={{ duration: dramatic ? 0.55 : 0.2, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <div className="absolute inset-0 speed-lines animate-speedLines opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,216,74,0.32),transparent_26%),radial-gradient(circle_at_20%_20%,rgba(74,217,255,0.18),transparent_25%),radial-gradient(circle_at_80%_15%,rgba(255,90,217,0.22),transparent_22%)]" />
        <div className="absolute inset-x-[-10%] top-[22%] h-12 -rotate-6 bg-gradient-to-r from-transparent via-ko-gold/55 to-transparent blur-2xl" />
        <div className="absolute inset-x-[-10%] top-[48%] h-24 -rotate-[12deg] bg-gradient-to-r from-transparent via-white/18 to-transparent blur-xl" />
        {(dramatic || reduced) && [...Array(dramatic ? 14 : 6)].map((_, index) => (
          <BurstShard key={index} index={index} dramatic={dramatic} />
        ))}
      </motion.div>

      <motion.div
        initial={dramatic ? { x: '-110%' } : { opacity: 0, y: 20 }}
        animate={dramatic ? { x: 0 } : { opacity: 1, y: 0 }}
        transition={{ duration: dramatic ? 0.42 : 0.24, ease: dramatic ? [0.16, 1, 0.3, 1] : 'easeOut' }}
        className="absolute left-[-8%] top-[18%] h-20 w-[130%] -rotate-[8deg] border-y border-white/10 bg-gradient-to-r from-ko-red/85 via-ko-gold/80 to-ko-blue/80 shadow-[0_0_60px_rgba(255,216,74,0.18)]"
      />

      <div className="relative flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.25 }}
          className="font-mono text-[11px] uppercase tracking-[0.65em] text-ko-blue"
        >
          showdown complete
        </motion.p>

        <motion.h2
          initial={dramatic ? { scale: 0.72, rotate: -5, opacity: 0 } : { opacity: 0, y: 10 }}
          animate={dramatic ? { scale: 1, rotate: 0, opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 210, damping: 16, delay: 0.12 }}
          className="font-display uppercase leading-none text-white"
          style={{
            fontSize: 'min(16vw, 164px)',
            WebkitTextStroke: '2px rgba(255,255,255,0.16)',
            textShadow: '0 0 18px rgba(255,216,74,0.38), 0 0 42px rgba(255,90,217,0.22)',
          }}
        >
          {isYou ? 'YOU WIN' : 'VICTORY'}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.3 }}
          className="mt-5 max-w-4xl"
        >
          <div className="mx-auto inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.38em] text-white/65">
            {isYou ? 'the table has a champion' : 'round claimed'}
          </div>
          <div className="mt-5 rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,10,34,0.94),rgba(12,9,24,0.92))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-7">
            <div className="absolute" />
            <p className="font-mono text-[10px] uppercase tracking-[0.38em] text-ko-gold/85">
              {isYou ? 'perfect momentum' : 'winner confirmed'}
            </p>
            <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.2em] text-white md:text-5xl">
              {isYou ? 'YOU TAKE THE TABLE' : `${winnerName.toUpperCase()} WINS`}
            </h3>
            <p className="mt-3 text-sm text-white/65 md:text-base">
              {isYou
                ? `Your room total is now ${winnerWins} ${winnerWins === 1 ? 'win' : 'wins'}.`
                : `${winnerName} now has ${winnerWins} ${winnerWins === 1 ? 'win' : 'wins'} in this room.`}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
              <div className="overflow-hidden rounded-2xl border border-ko-blue/18 bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-ko-blue">
                    Victory readout
                  </span>
                  <span className="rounded-full border border-ko-gold/25 bg-ko-gold/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ko-gold">
                    room locked in
                  </span>
                </div>
                <div className="space-y-3 px-4 py-4 text-left">
                  <p className="text-sm text-white/70">
                    {isYou
                      ? 'The round ends with your hand empty and the room score updated for everyone in realtime.'
                      : 'Everyone in the room sees the same winner state, celebration, and updated room score.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">winner</div>
                      <div className="mt-2 font-display text-xl tracking-[0.16em] text-white">
                        {isYou ? 'YOU' : winnerName.toUpperCase()}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">room wins</div>
                      <div className="mt-2 font-display text-3xl leading-none text-ko-gold">{winnerWins}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-ko-red/18 bg-gradient-to-br from-ko-red/16 via-transparent to-ko-gold/12 px-4 py-4 text-left">
                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-ko-red">
                  Next round
                </div>
                <p className="mt-3 text-sm text-white/70">
                  {canPlayAgain
                    ? 'Reset the table when everyone is ready. Seats and room win counts stay in place.'
                    : 'The host can reset the table when the celebration ends.'}
                </p>
                <button
                  onClick={onPlayAgain}
                  disabled={!canPlayAgain}
                  className="btn-primary mt-5 w-full text-base"
                  title={canPlayAgain ? '' : 'Only the host can start the next match'}
                >
                  {canPlayAgain ? 'PLAY AGAIN' : 'WAITING FOR HOST'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function BurstShard({ index, dramatic }: { index: number; dramatic: boolean }) {
  const left = 8 + ((index * 7) % 84);
  const duration = dramatic ? 1.8 : 1.2;
  const rotation = (index % 2 === 0 ? 1 : -1) * (18 + index * 4);
  const color = ['rgba(255,216,74,0.85)', 'rgba(74,217,255,0.75)', 'rgba(255,90,217,0.8)'][index % 3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 160, x: 0, rotate: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], y: -220, x: (index % 2 === 0 ? 1 : -1) * (44 + index * 6), rotate: rotation, scale: [0.6, 1, 0.8] }}
      transition={{ duration, delay: index * 0.05, ease: 'easeOut' }}
      className="absolute top-[58%] h-12 w-1"
      style={{ left: `${left}%`, background: color, boxShadow: `0 0 18px ${color}` }}
    />
  );
}
