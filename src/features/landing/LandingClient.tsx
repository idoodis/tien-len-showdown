'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRoomAction } from '@/server/actions/room';
import { usePlayerSession } from '@/features/player-session/usePlayerSession';
import { DisplayNameModal } from '@/components/room/DisplayNameModal';

export function LandingClient() {
  const router = useRouter();
  const session = usePlayerSession();
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [needsName, setNeedsName] = useState<null | 'create' | 'join'>(null);

  const doCreate = (displayName: string) => {
    setErr(null);
    start(async () => {
      const r = await createRoomAction({ playerId: session.playerId, displayName });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      router.push(`/room/${r.code}`);
    });
  };

  const doJoin = (displayName: string) => {
    setErr(null);
    if (!joinCode || joinCode.length < 4) {
      setErr('Enter a valid room code.');
      return;
    }
    router.push(`/room/${joinCode.toUpperCase()}?name=${encodeURIComponent(displayName)}`);
  };

  const handleCreate = () => {
    if (!session.ready) return;
    if (session.displayName) doCreate(session.displayName);
    else setNeedsName('create');
  };
  const handleJoin = () => {
    if (!session.ready) return;
    if (!joinCode.trim()) {
      setErr('Enter a room code first.');
      return;
    }
    if (session.displayName) doJoin(session.displayName);
    else setNeedsName('join');
  };

  return (
    <div className="space-y-10">
      <section className="arena relative overflow-hidden rounded-2xl p-8 md:p-14">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-ko-blue mb-2">VIETNAMESE THIRTEEN · ARCADE EDITION</p>
        <h1 className="font-display tracking-[0.04em] leading-none neon-text text-6xl md:text-8xl">
          TIEN&nbsp;LEN
          <br />
          <span className="neon-pink">SHOWDOWN</span>
        </h1>
        <div className="slash-divider my-6 max-w-md" />
        <p className="max-w-xl text-white/70 text-sm md:text-base">
          Invite friends in one click. No accounts. No payments. Just cards,
          dramatic turn callouts, and the satisfying click of a 2♥ slamming the trick.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 max-w-2xl">
          <button onClick={handleCreate} disabled={busy} className="btn-primary text-base h-12">
            {busy ? 'Spinning up…' : 'CREATE ROOM'}
          </button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="ROOM CODE"
              className="flex-1 rounded-md border border-white/10 bg-arena-0 px-3 py-2 font-mono uppercase tracking-[0.3em] outline-none focus:border-ko-blue"
            />
            <button onClick={handleJoin} disabled={busy} className="btn-secondary h-12">JOIN</button>
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-ko-red">{err}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Step n="01" title="Create a room">Get a six-letter code and a copyable invite link.</Step>
        <Step n="02" title="Share with friends">They paste the link, pick a name, take a seat.</Step>
        <Step n="03" title="Throw down">Host hits SHOWDOWN. Dramatic turn callouts. Last hand standing wins.</Step>
      </section>

      <div className="flex items-center justify-center gap-3 text-xs text-white/40">
        <Link href="/rules" className="hover:text-ko-blue">How to play</Link>
        <span>·</span>
        <Link href="/settings" className="hover:text-ko-blue">Settings</Link>
      </div>

      {needsName && (
        <DisplayNameModal
          title={needsName === 'create' ? 'Pick a display name' : 'Pick a display name to join'}
          cta={needsName === 'create' ? 'Create room' : 'Join'}
          onCancel={() => setNeedsName(null)}
          onSubmit={(name) => {
            session.setDisplayName(name);
            setNeedsName(null);
            if (needsName === 'create') doCreate(name);
            else doJoin(name);
          }}
        />
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="panel rounded-md p-4">
      <div className="font-mono text-xs text-ko-blue">{n}</div>
      <h3 className="font-display text-xl tracking-widest mt-1">{title}</h3>
      <p className="text-sm text-white/60 mt-1">{children}</p>
    </div>
  );
}
