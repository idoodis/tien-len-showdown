'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRoom } from '@/features/room/api';
import { usePlayerSession } from '@/features/player-session/usePlayerSession';
import { DisplayNameModal } from '@/components/room/DisplayNameModal';

export function LandingClient() {
  const router = useRouter();
  const session = usePlayerSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [needsName, setNeedsName] = useState<null | 'create' | 'join'>(null);

  const doCreate = async (displayName: string) => {
    setErr(null);
    setBusy(true);
    try {
      const result = await createRoom({ playerId: session.playerId, displayName });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      router.push(`/room/${result.data.roomCode}`);
    } finally {
      setBusy(false);
    }
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
    if (!session.ready || busy) return;
    if (session.displayName) {
      void doCreate(session.displayName);
      return;
    }
    setNeedsName('create');
  };

  const handleJoin = () => {
    if (!session.ready || busy) return;
    if (!joinCode.trim()) {
      setErr('Enter a room code first.');
      return;
    }
    if (session.displayName) {
      doJoin(session.displayName);
      return;
    }
    setNeedsName('join');
  };

  return (
    <div className="space-y-10">
      <section className="arena relative overflow-hidden rounded-2xl p-8 md:p-14">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.5em] text-ko-blue">VIETNAMESE THIRTEEN · ARCADE EDITION</p>
        <h1 className="font-display text-6xl leading-none tracking-[0.04em] neon-text md:text-8xl">
          TIEN&nbsp;LEN
          <br />
          <span className="neon-pink">SHOWDOWN</span>
        </h1>
        <div className="slash-divider my-6 max-w-md" />
        <p className="max-w-xl text-sm text-white/70 md:text-base">
          Invite friends in one click. No accounts. No payments. Just cards,
          dramatic turn callouts, and the satisfying click of a 2♥ slamming the trick.
        </p>

        <div className="mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
          <button onClick={handleCreate} disabled={busy} className="btn-primary h-12 text-base">
            {busy ? 'Spinning up…' : 'CREATE ROOM'}
          </button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
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
            if (needsName === 'create') {
              void doCreate(name);
              return;
            }
            doJoin(name);
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
      <h3 className="mt-1 font-display text-xl tracking-widest">{title}</h3>
      <p className="mt-1 text-sm text-white/60">{children}</p>
    </div>
  );
}
