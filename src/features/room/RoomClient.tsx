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

  const [, joinTransition] = useTransition();
  const [actionBusy, startAction] = useTransition();
  /** Fatal — can't be in the room at all (e.g. room expired, room not found). */
  const [fatalErr, setFatalErr] = useState<string | null>(null);
  /** Non-fatal — inline toast for action failures. Auto-clears. */
  const [actionErr, setActionErr] = useState<string | null>(null);

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
      if (!r.ok) {
        // Only treat "room not found / expired" as fatal — anything else is a transient retry.
        if (r.error === 'room_not_found' || r.error === 'room_expired') {
          setFatalErr(r.error);
        } else {
          setActionErr(`join: ${r.error}`);
        }
      } else {
        session.setDisplayName(initialName);
        refresh();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.ready, data?.isMember, initialName, code]);

  // Auto-dismiss inline action errors after 4s so they don't stick.
  useEffect(() => {
    if (!actionErr) return;
    const t = setTimeout(() => setActionErr(null), 4000);
    return () => clearTimeout(t);
  }, [actionErr]);

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

  if (fatalErr) {
    return (
      <div className="panel rounded-md p-6 space-y-3">
        <h2 className="font-display text-2xl tracking-widest text-ko-red">Could not join</h2>
        <p className="text-sm text-white/60">{humanError(fatalErr)}</p>
        <button onClick={() => router.push('/')} className="btn-ghost">Back to home</button>
      </div>
    );
  }

  const isHost = data.room.hostPlayerId === session.playerId;
  const me = data.players.find((p) => p.player_id === session.playerId) ?? null;
  const seatedCount = data.players.filter((p) => p.seat !== null).length;
  const canStart = isHost && seatedCount >= 2 && (data.room.status === 'lobby' || data.room.status === 'game_over');
  const isPlaying = data.room.status === 'playing';
  const displayName = session.displayName ?? initialName ?? undefined;

  const sit = (seat: number) =>
    startAction(async () => {
      setActionErr(null);
      const r = await sitAction({ code, playerId: session.playerId, displayName, seat });
      if (!r.ok) setActionErr(`Sit failed: ${humanError(r.error)}`);
      else await refresh(); // immediate optimistic refresh — don't wait for realtime
    });
  const stand = () =>
    startAction(async () => {
      setActionErr(null);
      const r = await standAction({ code, playerId: session.playerId });
      if (!r.ok) setActionErr(`Stand failed: ${humanError(r.error)}`);
      else await refresh();
    });
  const start = () =>
    startAction(async () => {
      setActionErr(null);
      const r = await startGameAction({ code, playerId: session.playerId });
      if (!r.ok) setActionErr(`Start failed: ${humanError(r.error)}`);
      else await refresh();
    });
  const leave = () =>
    startAction(async () => {
      setActionErr(null);
      await leaveRoomAction({ code, playerId: session.playerId });
      router.push('/');
    });
  const playAgain = () =>
    startAction(async () => {
      setActionErr(null);
      const r = await playAgainAction({ code, playerId: session.playerId });
      if (!r.ok) setActionErr(`Play again failed: ${humanError(r.error)}`);
      else await refresh();
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

      {actionErr && (
        <div
          role="alert"
          className="panel rounded-md border-l-2 border-ko-red px-4 py-2 text-sm text-ko-red"
        >
          {actionErr}
        </div>
      )}

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

          <div className="flex flex-wrap items-center gap-3">
            {isHost ? (
              <button
                onClick={start}
                disabled={actionBusy || seatedCount < 2 || isPlaying}
                className="btn-primary text-base"
              >
                {actionBusy
                  ? 'Starting…'
                  : data.room.status === 'game_over'
                    ? 'NEXT SHOWDOWN'
                    : 'START SHOWDOWN'}
              </button>
            ) : (
              <span className="text-xs text-white/50 font-mono uppercase tracking-widest">
                waiting for host…
              </span>
            )}
            {isHost && seatedCount < 2 && (
              <span className="text-xs text-white/50 font-mono uppercase tracking-widest">
                need at least 2 seated players
              </span>
            )}
            <span className="ml-auto text-[10px] text-white/40 font-mono uppercase tracking-widest">
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

/** Map raw action error codes to short, user-readable messages. */
function humanError(code: string): string {
  const map: Record<string, string> = {
    room_not_found: 'Room not found. The code may be wrong or the room expired.',
    room_expired: 'This room has expired. Create a new one.',
    seat_taken: 'Someone else just took that seat.',
    game_in_progress: 'Game already in progress.',
    host_only: 'Only the host can start the game.',
    need_at_least_2_seated: 'Need at least 2 players seated before starting.',
    too_many_seated: 'Only 4 players can play.',
    not_seated: "You're not seated in this match.",
  };
  if (map[code]) return map[code]!;
  if (code.startsWith('sit_failed:')) return code.replace('sit_failed:', 'Sit failed: ');
  if (code.startsWith('start_failed:')) return code.replace('start_failed:', 'Start failed: ');
  if (code.startsWith('join_failed:')) return code.replace('join_failed:', 'Join failed: ');
  return code;
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
