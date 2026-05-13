'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'tls.session';

export interface PlayerSession {
  playerId: string;
  displayName: string | null;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function read(): PlayerSession {
  if (typeof window === 'undefined') return { playerId: '', displayName: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerSession;
      if (parsed.playerId) return parsed;
    }
  } catch {
    /* corrupt — fall through to fresh */
  }
  const fresh: PlayerSession = { playerId: generateId(), displayName: null };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function write(s: PlayerSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** Anonymous identity persisted in localStorage. Stable across reloads. */
export function usePlayerSession() {
  const [session, setSession] = useState<PlayerSession>({ playerId: '', displayName: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = read();
    setSession(s);
    setReady(true);
  }, []);

  const setDisplayName = (name: string) => {
    const next: PlayerSession = { playerId: session.playerId || generateId(), displayName: name };
    write(next);
    setSession(next);
  };

  return { ...session, ready, setDisplayName };
}
