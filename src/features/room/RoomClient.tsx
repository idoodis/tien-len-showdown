'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlayerSession } from '@/features/player-session/usePlayerSession';
import { useRoomChannel } from '@/features/realtime/useRoomChannel';
import { useSettings } from '@/features/settings/useSettings';
import {
  joinRoomAction, leaveRoomAction, playAgainAction, sitAction, standAction, startGameAction,
} from '@/server/actions/room';
import { DisplayNameModal } from '@/components/room/DisplayNameModal';
import { InviteLinkBox } from '@/components/room/InviteLinkBox';
import { SeatPicker } from '@/components/room/SeatPicker';
import { ShowdownIntro } from '@/components/animations/ShowdownIntro';
import { GameTableView } from './GameTableView';

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const session = usePlayerSession();
  const sound = useSettings((s) => s.sound);

  const [joining, joinTransition] = useTransition();
  const [actionBusy, startAction] = useTransition();
  const [joinErr, setJoinErr] = useState<string | null>(null);

  const { data, refresh, lastEvent } = useRoomChannel({
    code,
    playerId: session.playerId,
  });

  // Pull the display-name override from ?name= if present (came from landing-page join button).
  const initialName = params.get('name') ?? session.displayName ?? '';

  // Join the room as soon as we have a name + a session.
  useEffect(() => {
    if (!session.ready) return;
    if (data?.isMember) return;
    if (!initialName) return;
    joinTransition(async () => {
      const r = await joinRoomAction({ code, playerId: session.playerId, displayName: initialName });
      if (!r.ok) setJoinErr(r.error);
      else {
        session.setDisplayName(initialName);
        refresh();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.ready, data?.isMember, initialName, code]);

  // Fire ShowdownIntro when the room status flips to "playing".
  const [introTrigger, setIntroTrigger] = useState(0);
  useEffect(() => {
    if (data?.publicState?.status === 'playing' && data.publicState.tick <= 1) {
      setIntroTrigger((n) => n + 1);
    }
  }, [data?.publicState?.status, data?.publicState?.tick]);

  // No name yet → show modal.
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

  if (joinErr) {
    return (
      <div className="panel rounded-md p-6 space-y-3">
        <h2 className="font-display text-2xl tracking-widest text-ko-red">Could not join</h2>
        <p className="text-sm text-white/60">{joinErr}</p>
        <button onClick={() => router.push('/')} className="btn-ghost">Back to home</button>
      </div>
    );
  }

  const isHost = data.room.hostPlayerId === session.playerId;
  const me = data.players.find((p) => p.player_id === session.playerId) ?? null;
  const seatedCount = data.players.filter((p) => p.seat !== null).length;
  const canStart = isHost && seatedCount >= 2 && (data.room.status === 'lobby' || data.room.status === 'game_over');
  const isPlaying = data.room.status === 'playing';

  const sit = (seat: number) =>
    startAction(async () => {
      const r = await sitAction({ code, playerId: session.playerId, seat });
      if (!r.ok) setJoinErr(r.error);
    });
  const stand = () =>
    startAction(async () => {
      await standAction({ code, playerId: session.playerId });
    });
  const start = () =>
    startAction(async () => {
      const r = await startGameAction({ code, playerId: session.playerId });
      if (!r.ok) setJoinErr(r.error);
    });
  const leave = () =>
    startAction(async () => {
      await leaveRoomAction({ code, playerId: session.playerId });
      router.push('/');
    });
  const playAgain = () =>
    startAction(async () => {
      await playAgainAction({ code, playerId: session.playerId });
    });

  return (
    <div className="space-y-5">
      <ShowdownIntro trigger={introTrigger} />

      <div className="flex flex-wrap items-center gap-3">
        <InviteLinkBox code={code} />
        <div className="ml-auto flex gap-2">
          <button onClick={leave} className="btn-danger text-xs">Leave room</button>
        </div>
      </div>

      {!isPlaying && (
        <div className="panel rounded-md p-5 space-y-5">
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
            onSit={sit}
            onStand={stand}
            busy={actionBusy}
          />

          <div className="flex flex-wrap gap-2">
            {canStart ? (
              <button onClick={start} disabled={actionBusy} className="btn-primary text-base">
                {data.room.status === 'game_over' ? 'NEXT SHOWDOWN' : 'START SHOWDOWN'}
              </button>
            ) : (
              <div className="text-xs text-white/50 font-mono uppercase tracking-widest">
                {!isHost && 'waiting for host…'}
                {isHost && seatedCount < 2 && 'need at least 2 seated players'}
              </div>
            )}
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
          onPlayAgain={playAgain}
          onLeave={leave}
          lastEvent={lastEvent}
          autoSubmitQueued={useSettings.getState().autoSubmitQueued}
          mute={!sound}
        />
      )}

      {isPlaying && !me && (
        <div className="panel rounded-md p-6 text-sm text-white/60">
          You are spectating. Sit out the match to reset and join the next one.
        </div>
      )}
    </div>
  );
}

function PlayersList({
  players,
  myPlayerId,
}: { players: { player_id: string; display_name: string; seat: number | null; is_host: boolean; connected: boolean }[]; myPlayerId: string }) {
  if (players.length === 0) return null;
  return (
    <div className="border-t border-white/5 pt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40 mb-2">In the room</div>
      <ul className="flex flex-wrap gap-2">
        {players.map((p) => (
          <li
            key={p.player_id}
            className={`rounded-full panel px-3 py-1 text-xs ${p.player_id === myPlayerId ? 'ring-1 ring-ko-blue/60' : ''}`}
          >
            {p.is_host && <span className="text-ko-gold mr-1">★</span>}
            <span className="font-display tracking-widest">{p.display_name}</span>
            {p.seat !== null && <span className="ml-1 text-white/40">· seat {p.seat + 1}</span>}
            {!p.connected && <span className="ml-1 text-ko-red">(offline)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
