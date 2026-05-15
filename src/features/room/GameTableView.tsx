'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Hand } from '@/components/cards/Hand';
import { PlayedPile } from '@/components/cards/PlayedPile';
import { TurnAnnouncement } from '@/components/animations/TurnAnnouncement';
import { WinnerOverlay } from '@/components/animations/WinnerOverlay';
import { PlayerSeat } from '@/components/game/PlayerSeat';
import { RoomScoreboard } from '@/components/room/RoomScoreboard';
import { passTurn, playAgain, playCards, queueMove } from '@/features/room/api';
import { getLeaderIds } from '@/features/room/scoreboard';
import type { RoomPlayerView } from '@/features/room/types';
import { detectCombo } from '@/game/rules/combos';
import type { Card } from '@/game/rules/types';
import type { PublicState } from '@/game/state/projection';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface Props {
  code: string;
  playerId: string;
  publicState: PublicState;
  players: RoomPlayerView[];
  yourHand: Card[];
  yourQueued: number[] | null;
  isHost: boolean;
  onLeave: () => void;
  refreshRoom: () => Promise<void>;
  lastEvent: { kind: string; payload: Record<string, unknown>; playerId: string | null } | null;
  autoSubmitQueued: boolean;
  mute: boolean;
}

export function GameTableView(props: Props) {
  const { publicState, players, yourHand, code, playerId } = props;
  const roomPlayersById = useMemo(
    () => new Map(players.map((player) => [player.playerId, player])),
    [players],
  );
  const leaderIds = useMemo(() => new Set(getLeaderIds(players)), [players]);
  const mySeat = publicState.players.find((player) => player.playerId === playerId)?.seat ?? -1;
  const me = publicState.players.find((player) => player.playerId === playerId);
  const myRoomPlayer = roomPlayersById.get(playerId) ?? null;
  const isMyTurn = publicState.turn === mySeat && me?.finishedAt === null;
  const gameOver = publicState.status === 'game_over';

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [queueErr, setQueueErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showTurn, setShowTurn] = useState(false);
  const prevTurn = useRef<number>(-1);
  const announcedWinner = useRef<string | null>(null);

  useEffect(() => {
    if (gameOver) return;
    if (prevTurn.current === publicState.turn) return;
    prevTurn.current = publicState.turn;
    setShowTurn(true);
    playSound('turn_start', props.mute);
    const timeoutId = window.setTimeout(() => setShowTurn(false), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [gameOver, props.mute, publicState.turn]);

  useEffect(() => {
    setSelected((current) => {
      const inHand = new Set(yourHand.map((card) => card.id));
      const next = new Set<number>();
      for (const id of current) {
        if (inHand.has(id)) next.add(id);
      }
      return next;
    });
  }, [yourHand]);

  useEffect(() => {
    if (!isMyTurn || !props.autoSubmitQueued || !props.yourQueued || props.yourQueued.length === 0) return;
    const queuedIds = props.yourQueued;
    const timeoutId = window.setTimeout(() => {
      void submitPlay(queuedIds);
    }, 1000);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, props.autoSubmitQueued, props.yourQueued]);

  useEffect(() => {
    if (!gameOver || !publicState.completedGameId) return;
    if (announcedWinner.current === publicState.completedGameId) return;
    announcedWinner.current = publicState.completedGameId;
    playSound('winner', props.mute);
    playSound('win_increment', props.mute);
  }, [gameOver, props.mute, publicState.completedGameId]);

  const previewCombo = useMemo(() => {
    const cards = yourHand.filter((card) => selected.has(card.id));
    return cards.length > 0 ? detectCombo(cards) : null;
  }, [selected, yourHand]);

  const runBusyAction = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const submitPlay = async (cardIds: number[]) => {
    await runBusyAction(async () => {
      const result = await playCards({ roomCode: code, playerId, cardIds });
      if (!result.ok) {
        setQueueErr(result.error);
        playSound('invalid_move', props.mute);
        setShake((count) => count + 1);
        return;
      }
      playSound('card_play', props.mute);
      setQueueErr(null);
      setSelected(new Set());
      await props.refreshRoom();
    });
  };

  const onPass = async () => {
    await runBusyAction(async () => {
      const result = await passTurn({ roomCode: code, playerId });
      if (!result.ok) {
        setQueueErr(result.error);
        setShake((count) => count + 1);
        return;
      }
      playSound('pass', props.mute);
      setQueueErr(null);
      await props.refreshRoom();
    });
  };

  const onQueue = async () => {
    await runBusyAction(async () => {
      const result = await queueMove({
        roomCode: code,
        playerId,
        cardIds: [...selected],
      });
      if (!result.ok) {
        setQueueErr(result.error);
        setShake((count) => count + 1);
        return;
      }
      setQueueErr(null);
      await props.refreshRoom();
    });
  };

  const onCancelQueue = async () => {
    await runBusyAction(async () => {
      const result = await queueMove({ roomCode: code, playerId, cardIds: [] });
      if (!result.ok) {
        setQueueErr(result.error);
        return;
      }
      setQueueErr(null);
      await props.refreshRoom();
    });
  };

  const onPlayAgain = async () => {
    await runBusyAction(async () => {
      const result = await playAgain({ roomCode: code, playerId });
      if (!result.ok) {
        setQueueErr(result.error);
        return;
      }
      playSound('play_again', props.mute);
      setQueueErr(null);
      await props.refreshRoom();
    });
  };

  const opponentLayout = useMemo(() => {
    const others = publicState.players.filter((player) => player.playerId !== playerId);
    const positions: Array<'top' | 'left' | 'right'> =
      others.length === 1 ? ['top']
      : others.length === 2 ? ['left', 'right']
      : ['left', 'top', 'right'];

    return others.map((player, index) => {
      const roomPlayer = roomPlayersById.get(player.playerId);
      return {
        ...player,
        position: positions[index] ?? 'top',
        name: roomPlayer?.displayName ?? `P${player.seat + 1}`,
        isHost: roomPlayer?.isHost ?? false,
        wins: roomPlayer?.wins ?? 0,
      };
    });
  }, [playerId, publicState.players, roomPlayersById]);

  const winnerPlayerId = publicState.winnerPlayerId
    ?? (gameOver ? publicState.players[publicState.finishingOrder[0] ?? -1]?.playerId ?? null : null);
  const winnerName = publicState.winnerDisplayName
    ?? (winnerPlayerId ? roomPlayersById.get(winnerPlayerId)?.displayName ?? 'Winner' : '');
  const winnerIsYou = winnerPlayerId === playerId;
  const winnerWins = winnerPlayerId ? roomPlayersById.get(winnerPlayerId)?.wins ?? 0 : 0;

  const controllingSeat = publicState.controllingSeat;
  const controllerPlayerId = controllingSeat !== null ? publicState.players[controllingSeat]?.playerId ?? null : null;
  const controllerName = controllerPlayerId ? roomPlayersById.get(controllerPlayerId)?.displayName ?? null : null;

  const activeTurnName = roomPlayersById.get(publicState.players[publicState.turn]?.playerId ?? '')?.displayName
    ?? `seat ${publicState.turn + 1}`;

  return (
    <div className="space-y-4">
      <RoomScoreboard
        players={players}
        myPlayerId={playerId}
        winnerPlayerId={winnerPlayerId}
        compact
      />

      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
        transition={{ duration: 0.32 }}
        className="arena relative h-[560px] overflow-hidden rounded-2xl md:h-[620px]"
      >
        {opponentLayout.map((opponent) => (
          <PlayerSeat
            key={opponent.playerId}
            name={opponent.name}
            cardCount={opponent.handCount}
            isActive={publicState.turn === opponent.seat && opponent.finishedAt === null && !gameOver}
            finishedAt={opponent.finishedAt}
            isHost={opponent.isHost}
            isYou={false}
            wins={opponent.wins}
            isLeader={leaderIds.has(opponent.playerId)}
            isWinner={winnerPlayerId === opponent.playerId}
            position={opponent.position}
          />
        ))}

        {myRoomPlayer && me && (
          <PlayerSeat
            name={myRoomPlayer.displayName}
            cardCount={me.handCount}
            isActive={isMyTurn && !gameOver}
            finishedAt={me.finishedAt}
            isHost={myRoomPlayer.isHost}
            isYou
            wins={myRoomPlayer.wins}
            isLeader={leaderIds.has(myRoomPlayer.playerId)}
            isWinner={winnerPlayerId === myRoomPlayer.playerId}
            position="bottom"
          />
        )}

        <div className="absolute inset-0 grid place-items-center">
          <PlayedPile combo={publicState.currentCombo} controllerName={controllerName} />
        </div>

        {me && me.finishedAt === null && (
          <div className="absolute bottom-3 left-0 right-0">
            <Hand
              cards={yourHand}
              selectedIds={selected}
              onToggle={(id) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })}
              highlight={previewCombo ? 'gold' : null}
            />
          </div>
        )}

          <div className="panel absolute left-3 top-3 rounded-md px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">
            Current turn
          </div>
          <div className="mt-1 font-display text-lg tracking-[0.16em] text-white">
            {gameOver ? 'MATCH OVER' : (isMyTurn ? 'YOU' : activeTurnName.toUpperCase())}
          </div>
        </div>

        <div className="panel absolute right-3 top-3 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.4em] text-white/60">
          tick {publicState.tick}
        </div>

        <AnimatePresence>
          {gameOver && winnerName && (
            <WinnerOverlay
              winnerName={winnerName}
              winnerWins={winnerWins}
              isYou={winnerIsYou}
              canPlayAgain={props.isHost}
              onPlayAgain={onPlayAgain}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {me && me.finishedAt === null && !gameOver && (
        <div className="panel rounded-md p-3">
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
            <div className="col-span-2 font-mono text-xs uppercase tracking-widest text-white/60 md:col-span-1">
              {previewCombo ? (
                <>
                  <span className="text-white/40">preview:</span>{' '}
                  <span className="text-ko-gold">{previewCombo.kind.replace('-', ' ')}</span>
                </>
              ) : (
                <span className="text-white/30">select cards...</span>
              )}
            </div>
            <div className="hidden flex-1 md:block" />
            <button onClick={() => void submitPlay([...selected])} disabled={!isMyTurn || busy || selected.size === 0} className="btn-primary min-h-11 w-full md:w-auto">PLAY</button>
            <button onClick={() => void onPass()} disabled={!isMyTurn || busy || !publicState.currentCombo} className="btn-secondary min-h-11 w-full md:w-auto">PASS</button>
            <button
              onClick={() => void onQueue()}
              disabled={isMyTurn || busy || selected.size === 0}
              className="btn-ghost min-h-11 w-full md:w-auto"
              title="Queue this move to auto-submit when your turn arrives"
            >
              QUEUE MOVE
            </button>
            {props.yourQueued && (
              <button onClick={() => void onCancelQueue()} disabled={busy} className="btn-danger min-h-11 w-full md:w-auto">CANCEL QUEUE</button>
            )}
            <button onClick={() => setSelected(new Set())} disabled={selected.size === 0 || busy} className="btn-ghost min-h-11 w-full md:w-auto">
              CLEAR
            </button>
            <button onClick={props.onLeave} disabled={busy} className="btn-ghost col-span-2 min-h-11 w-full md:col-span-1 md:w-auto">
              LEAVE ROOM
            </button>
          </div>
          <div className={cn('mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-white/50')}>
            <span>
              turn: <span className={isMyTurn ? 'text-ko-blue' : 'text-white/70'}>{isMyTurn ? 'YOU' : activeTurnName}</span>
            </span>
            {props.yourQueued && (
              <span className="text-ko-gold">
                queued {props.yourQueued.length}-card move ·
                {props.autoSubmitQueued ? ' auto-submits' : ' confirm when ready'}
              </span>
            )}
            {queueErr && <span className="text-ko-red">{queueErr}</span>}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="panel rounded-md px-4 py-3 text-sm text-white/65">
          {props.isHost
            ? 'Play Again resets the table to the lobby and keeps the room win totals.'
            : 'Waiting for the host to reset the table for the next showdown.'}
        </div>
      )}

      <TurnAnnouncement show={showTurn} who={activeTurnName} isYou={!!isMyTurn} />
    </div>
  );
}
