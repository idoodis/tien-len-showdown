'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Hand } from '@/components/cards/Hand';
import { PlayedPile } from '@/components/cards/PlayedPile';
import { PlayerSeat } from '@/components/game/PlayerSeat';
import { TurnAnnouncement } from '@/components/animations/TurnAnnouncement';
import { WinnerOverlay } from '@/components/animations/WinnerOverlay';
import { detectCombo } from '@/game/rules/combos';
import type { Card } from '@/game/rules/types';
import type { PublicState } from '@/game/state/projection';
import { passAction, playAction, queueMoveAction } from '@/server/actions/room';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface RoomPlayer {
  player_id: string;
  display_name: string;
  seat: number | null;
  is_host: boolean;
  connected: boolean;
}

interface Props {
  code: string;
  playerId: string;
  publicState: PublicState;
  players: RoomPlayer[];
  yourHand: Card[];
  yourQueued: number[] | null;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
  lastEvent: { kind: string; payload: Record<string, unknown>; playerId: string | null } | null;
  autoSubmitQueued: boolean;
  mute: boolean;
}

export function GameTableView(props: Props) {
  const { publicState: ps, players, yourHand, code, playerId } = props;
  const mySeat = ps.players.find((p) => p.playerId === playerId)?.seat ?? -1;
  const me = ps.players.find((p) => p.playerId === playerId);
  const isMyTurn = ps.turn === mySeat && me && me.finishedAt === null;
  const gameOver = ps.status === 'game_over';

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [queueErr, setQueueErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [pending, startTransition] = useTransition();

  // Turn announcement triggered when turn changes.
  const [showTurn, setShowTurn] = useState(false);
  const prevTurn = useRef<number>(-1);
  useEffect(() => {
    if (gameOver) return;
    if (prevTurn.current === ps.turn) return;
    prevTurn.current = ps.turn;
    setShowTurn(true);
    playSound('turn_start', props.mute);
    const id = setTimeout(() => setShowTurn(false), 1400);
    return () => clearTimeout(id);
  }, [ps.turn, gameOver, props.mute]);

  // Auto-clear selection when our hand changes (after a play).
  useEffect(() => {
    setSelected((cur) => {
      const ids = new Set(yourHand.map((c) => c.id));
      const next = new Set<number>();
      for (const id of cur) if (ids.has(id)) next.add(id);
      return next;
    });
  }, [yourHand]);

  // When my turn arrives and I have a server-queued move, optionally auto-submit.
  useEffect(() => {
    if (!isMyTurn) return;
    if (!props.yourQueued || props.yourQueued.length === 0) return;
    if (!props.autoSubmitQueued) return;
    const ids = props.yourQueued;
    const t = setTimeout(() => {
      submitPlay(ids);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, props.yourQueued, props.autoSubmitQueued]);

  const previewCombo = useMemo(() => {
    const cards = yourHand.filter((c) => selected.has(c.id));
    return cards.length ? detectCombo(cards) : null;
  }, [selected, yourHand]);

  const submitPlay = (cardIds: number[]) => {
    startTransition(async () => {
      const r = await playAction({ code, playerId, cardIds });
      if (!r.ok) {
        setQueueErr(r.error);
        playSound('invalid_move', props.mute);
        setShake((s) => s + 1);
        return;
      }
      playSound('card_play', props.mute);
      setQueueErr(null);
      setSelected(new Set());
    });
  };

  const onPlay = () => submitPlay([...selected]);
  const onPass = () => {
    startTransition(async () => {
      const r = await passAction({ code, playerId });
      if (!r.ok) {
        setQueueErr(r.error);
        setShake((s) => s + 1);
        return;
      }
      playSound('pass', props.mute);
      setQueueErr(null);
    });
  };
  const onQueue = () => {
    const ids = [...selected];
    startTransition(async () => {
      const r = await queueMoveAction({ code, playerId, cardIds: ids });
      if (!r.ok) {
        setQueueErr(r.error);
        setShake((s) => s + 1);
        return;
      }
      setQueueErr(null);
    });
  };
  const onCancelQueue = () => {
    startTransition(async () => {
      await queueMoveAction({ code, playerId, cardIds: [] });
    });
  };

  // Layout opponents around the table.
  const opponentLayout = useMemo(() => {
    const others = ps.players.filter((p) => p.playerId !== playerId);
    const positions: Array<'top' | 'left' | 'right'> =
      others.length === 1 ? ['top']
    : others.length === 2 ? ['left', 'right']
    : ['left', 'top', 'right'];
    return others.map((p, i) => ({
      ...p,
      position: positions[i] ?? 'top',
      name:
        players.find((pl) => pl.player_id === p.playerId)?.display_name
        ?? `P${p.seat + 1}`,
      isHost: players.find((pl) => pl.player_id === p.playerId)?.is_host ?? false,
    }));
  }, [ps.players, playerId, players]);

  const winnerSeat = gameOver ? ps.finishingOrder[0] ?? null : null;
  const winnerName = winnerSeat != null
    ? (players.find((pl) => pl.player_id === ps.players[winnerSeat]?.playerId)?.display_name ?? 'WINNER')
    : '';
  const winnerIsYou = winnerSeat === mySeat;

  const controllerName = ps.controllingSeat != null
    ? players.find((pl) => pl.player_id === ps.players[ps.controllingSeat!]?.playerId)?.display_name ?? null
    : null;

  const activeTurnName =
    players.find((pl) => pl.player_id === ps.players[ps.turn]?.playerId)?.display_name ?? `seat ${ps.turn + 1}`;

  return (
    <div className="space-y-4">
      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
        transition={{ duration: 0.32 }}
        className="arena relative overflow-hidden rounded-2xl h-[560px]"
      >
        {/* Opponents around the table */}
        {opponentLayout.map((o) => (
          <PlayerSeat
            key={o.playerId}
            name={o.name}
            cardCount={o.handCount}
            isActive={ps.turn === o.seat && o.finishedAt === null && !gameOver}
            finishedAt={o.finishedAt}
            isHost={o.isHost}
            isYou={false}
            position={o.position as 'top' | 'left' | 'right'}
          />
        ))}

        {/* Center: played pile + controller indicator */}
        <div className="absolute inset-0 grid place-items-center">
          <PlayedPile combo={ps.currentCombo} controllerName={controllerName} />
        </div>

        {/* Bottom: my hand */}
        {me && me.finishedAt === null && (
          <div className="absolute bottom-3 left-0 right-0">
            <Hand
              cards={yourHand}
              selectedIds={selected}
              onToggle={(id) =>
                setSelected((cur) => {
                  const n = new Set(cur);
                  n.has(id) ? n.delete(id) : n.add(id);
                  return n;
                })
              }
              highlight={previewCombo ? 'gold' : null}
            />
          </div>
        )}

        {/* Status strip */}
        <div className="absolute top-3 right-3 panel rounded-md px-3 py-1.5 text-[10px] uppercase tracking-[0.4em] text-white/60">
          tick {ps.tick}
        </div>

        <AnimatePresence>
          {gameOver && winnerName && (
            <WinnerOverlay
              winnerName={winnerName}
              isYou={!!winnerIsYou}
              canPlayAgain={props.isHost}
              onPlayAgain={props.onPlayAgain}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action bar */}
      {me && me.finishedAt === null && !gameOver && (
        <div className="panel rounded-md p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-white/60 font-mono uppercase tracking-widest">
              {previewCombo ? (
                <>
                  <span className="text-white/40">preview:</span>{' '}
                  <span className="text-ko-gold">{previewCombo.kind.replace('-', ' ')}</span>
                </>
              ) : (
                <span className="text-white/30">select cards…</span>
              )}
            </div>
            <div className="flex-1" />
            <button onClick={onPlay} disabled={!isMyTurn || pending || selected.size === 0} className="btn-primary">PLAY</button>
            <button onClick={onPass} disabled={!isMyTurn || pending || !ps.currentCombo} className="btn-secondary">PASS</button>
            <button
              onClick={onQueue}
              disabled={!!isMyTurn || pending || selected.size === 0}
              className="btn-ghost"
              title="Queue this move to auto-submit when your turn arrives"
            >
              QUEUE MOVE
            </button>
            {props.yourQueued && (
              <button onClick={onCancelQueue} className="btn-danger">CANCEL QUEUE</button>
            )}
            <button onClick={() => setSelected(new Set())} disabled={selected.size === 0} className="btn-ghost">
              CLEAR
            </button>
          </div>
          <div className={cn('mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-widest text-white/50', 'font-mono')}>
            <span>
              turn: <span className={isMyTurn ? 'text-ko-blue' : 'text-white/70'}>{isMyTurn ? 'YOU' : activeTurnName}</span>
            </span>
            {props.yourQueued && (
              <span className="text-ko-gold">
                queued {props.yourQueued.length}-card move ·
                {props.autoSubmitQueued ? ' auto-submits' : ' confirm when ready'}
              </span>
            )}
            {queueErr && <span className="text-ko-red">{queueErr.replace(/_/g, ' ')}</span>}
          </div>
        </div>
      )}

      <TurnAnnouncement show={showTurn} who={activeTurnName} isYou={!!isMyTurn} />
    </div>
  );
}
