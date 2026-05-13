'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DisplayNameModal } from '@/components/room/DisplayNameModal';
import { InviteLinkBox } from '@/components/room/InviteLinkBox';
import { SeatPicker } from '@/components/room/SeatPicker';
import { ShowdownIntro } from '@/components/animations/ShowdownIntro';
import { joinRoom, leaveRoom, leaveSeat, playAgain, sitInRoom, startRoom } from '@/features/room/api';
import { usePlayerSession } from '@/features/player-session/usePlayerSession';
import { useRoomChannel } from '@/features/realtime/useRoomChannel';
import { useSettings } from '@/features/settings/useSettings';
import { debugLog } from '@/lib/debug';
import { GameTableView } from './GameTableView';

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = usePlayerSession();
  const sound = useSettings((state) => state.sound);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [fatalErr, setFatalErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const { data, refresh, lastEvent } = useRoomChannel({
    code,
    playerId: session.playerId,
  });

  const initialName = searchParams.get('name') ?? session.displayName ?? '';

  useEffect(() => {
    if (!session.ready || data?.isMember || !initialName) return;

    let cancelled = false;
    const runJoin = async () => {
      debugLog('room:join', { code, playerId: session.playerId, displayName: initialName });
      const result = await joinRoom({
        roomCode: code,
        playerId: session.playerId,
        displayName: initialName,
      });

      if (cancelled) return;
      if (!result.ok) {
        if (result.code === 'room_not_found' || result.code === 'room_expired') {
          setFatalErr(result.error);
          return;
        }
        setActionErr(result.error);
        return;
      }

      session.setDisplayName(initialName);
      await refresh();
    };

    void runJoin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, data?.isMember, initialName, session.ready]);

  useEffect(() => {
    if (!actionErr) return;
    const timeoutId = window.setTimeout(() => setActionErr(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [actionErr]);

  const [introTrigger, setIntroTrigger] = useState(0);
  useEffect(() => {
    if (data?.publicState?.status === 'playing' && data.publicState.tick <= 1) {
      setIntroTrigger((count) => count + 1);
    }
  }, [data?.publicState?.status, data?.publicState?.tick]);

  const runAction = async (action: string, work: () => Promise<void>) => {
    if (busyAction) return;
    setBusyAction(action);
    setActionErr(null);
    try {
      await work();
    } finally {
      setBusyAction(null);
    }
  };

  const displayName = session.displayName ?? initialName ?? undefined;
  const isBusy = busyAction !== null;

  const roomSummary = useMemo(() => {
    if (!data) {
      return {
        isHost: false,
        seatedCount: 0,
        isPlaying: false,
        me: null,
        startReason: 'Loading room…',
      };
    }

    const isHost = data.room.hostPlayerId === session.playerId;
    const seatedCount = data.players.filter((player) => player.seatIndex !== null).length;
    const isPlaying = data.room.status === 'playing';
    const me = data.players.find((player) => player.playerId === session.playerId) ?? null;

    let startReason: string | null = null;
    if (!isHost) startReason = 'Only the host can start the game.';
    else if (isPlaying) startReason = 'Game already started.';
    else if (seatedCount < 2) startReason = 'Need at least 2 seated players.';

    return { isHost, seatedCount, isPlaying, me, startReason };
  }, [data, session.playerId]);

  if (session.ready && !initialName && !session.displayName) {
    return (
      <DisplayNameModal
        title="Enter your display name"
        cta="Join room"
        onSubmit={(name) => {
          session.setDisplayName(name);
        }}
        onCancel={() => router.push('/')}
      />
    );
  }

  if (!session.ready || !data) {
    return (
      <div className="panel rounded-md p-6 text-sm text-white/60">
        Connecting to room <span className="font-mono text-ko-gold">{code}</span>…
      </div>
    );
  }

  if (fatalErr) {
    return (
      <div className="panel space-y-3 rounded-md p-6">
        <h2 className="font-display text-2xl tracking-widest text-ko-red">Could not join</h2>
        <p className="text-sm text-white/60">{fatalErr}</p>
        <button onClick={() => router.push('/')} className="btn-ghost">Back to home</button>
      </div>
    );
  }

  const { isHost, seatedCount, isPlaying, me, startReason } = roomSummary;

  const handleSit = (seatIndex: number) => {
    if (!displayName) {
      setActionErr('Enter a display name before taking a seat.');
      return;
    }

    void runAction('sit', async () => {
      const result = await sitInRoom({
        roomCode: code,
        playerId: session.playerId,
        displayName,
        seatIndex,
      });
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      await refresh();
    });
  };

  const handleStand = () => {
    void runAction('stand', async () => {
      const result = await leaveSeat({
        roomCode: code,
        playerId: session.playerId,
      });
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      await refresh();
    });
  };

  const handleStart = () => {
    void runAction('start', async () => {
      debugLog('room:start', { code, playerId: session.playerId });
      const result = await startRoom({
        roomCode: code,
        playerId: session.playerId,
      });
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      await refresh();
    });
  };

  const handleLeave = () => {
    void runAction('leave', async () => {
      const result = await leaveRoom({
        roomCode: code,
        playerId: session.playerId,
      });
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      router.push('/');
    });
  };

  const handlePlayAgain = () => {
    void runAction('play-again', async () => {
      const result = await playAgain({
        roomCode: code,
        playerId: session.playerId,
      });
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      await refresh();
    });
  };

  return (
    <div className="space-y-5">
      <ShowdownIntro trigger={introTrigger} />

      <div className="flex flex-wrap items-center gap-3">
        <InviteLinkBox code={code} />
        <div className="ml-auto flex gap-2">
          <button onClick={handleLeave} disabled={isBusy} className="btn-danger text-xs">Leave room</button>
        </div>
      </div>

      {actionErr && (
        <div role="alert" className="panel rounded-md border-l-2 border-ko-red px-4 py-2 text-sm text-ko-red">
          {actionErr}
        </div>
      )}

      {!isPlaying && (
        <div className="panel space-y-5 rounded-md p-5">
          <div>
            <h2 className="font-display text-2xl tracking-widest">
              {data.room.status === 'game_over' ? 'MATCH FINISHED' : 'WAITING ROOM'}
            </h2>
            <p className="text-xs text-white/50">
              {isHost
                ? 'You are the host. Pick a seat and hit Start when at least 2 players are seated.'
                : 'Pick a seat. The host will start the match.'}
            </p>
          </div>

          <SeatPicker
            players={data.players}
            myPlayerId={session.playerId}
            onSit={handleSit}
            onStand={handleStand}
            onSeatBlocked={setActionErr}
            busy={isBusy}
          />

          <div className="flex flex-wrap items-center gap-3">
            {isHost ? (
              <button
                onClick={handleStart}
                disabled={isBusy || !!startReason}
                className="btn-primary text-base"
                title={startReason ?? undefined}
              >
                {busyAction === 'start'
                  ? 'STARTING…'
                  : data.room.status === 'game_over'
                    ? 'NEXT SHOWDOWN'
                    : 'START SHOWDOWN'}
              </button>
            ) : (
              <span className="font-mono text-xs uppercase tracking-widest text-white/50">
                waiting for host…
              </span>
            )}
            {startReason && (
              <span className="font-mono text-xs uppercase tracking-widest text-white/50">
                {startReason}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-white/40">
              seated: {seatedCount}/4
            </span>
          </div>

          <PlayersList players={data.players} myPlayerId={session.playerId} />
        </div>
      )}

      {isPlaying && me && data.publicState && data.yourHand !== null && (
        <GameTableView
          code={code}
          playerId={session.playerId}
          publicState={data.publicState}
          players={data.players}
          yourHand={data.yourHand}
          yourQueued={data.yourQueued}
          isHost={isHost}
          onLeave={handleLeave}
          refreshRoom={refresh}
          lastEvent={lastEvent}
          autoSubmitQueued={useSettings.getState().autoSubmitQueued}
          mute={!sound}
        />
      )}

      {isPlaying && !me && (
        <div className="panel rounded-md p-6 text-sm text-white/60">
          You are spectating. Sit out this match, then join the next showdown when the room resets.
        </div>
      )}
    </div>
  );
}

function PlayersList({
  players,
  myPlayerId,
}: {
  players: {
    playerId: string;
    displayName: string;
    seatIndex: number | null;
    isHost: boolean;
    connected: boolean;
  }[];
  myPlayerId: string;
}) {
  if (players.length === 0) return null;

  return (
    <div className="border-t border-white/5 pt-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">In the room</div>
      <ul className="flex flex-wrap gap-2">
        {players.map((player) => (
          <li
            key={player.playerId}
            className={`panel rounded-full px-3 py-1 text-xs ${player.playerId === myPlayerId ? 'ring-1 ring-ko-blue/60' : ''}`}
          >
            {player.isHost && <span className="mr-1 text-ko-gold">★</span>}
            <span className="font-display tracking-widest">{player.displayName}</span>
            {player.seatIndex !== null && <span className="ml-1 text-white/40">· seat {player.seatIndex + 1}</span>}
            {!player.connected && <span className="ml-1 text-ko-red">(offline)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
