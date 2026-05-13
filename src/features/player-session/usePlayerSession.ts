'use client';

import { useEffect, useState } from 'react';
import { debugLog } from '@/lib/debug';

const STORAGE_KEY = 'tls.session';

export interface PlayerSession {
  playerId: string;
  displayName: string | null;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function read(): PlayerSession {
  if (typeof window === 'undefined') return { playerId: '', displayName: null };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerSession;
      if (parsed.playerId) {
        return parsed;
      }
    }
  } catch {
    // Ignore corrupt localStorage and replace it with a fresh session.
  }

  const fresh: PlayerSession = { playerId: generateId(), displayName: null };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  debugLog('player-session', 'created playerId', fresh.playerId);
  return fresh;
}

function write(session: PlayerSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function usePlayerSession() {
  const [session, setSession] = useState<PlayerSession>({ playerId: '', displayName: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextSession = read();
    setSession(nextSession);
    debugLog('player-session', 'loaded session', nextSession);
    setReady(true);
  }, []);

  const setDisplayName = (name: string) => {
    const trimmedName = name.trim();
    const nextSession: PlayerSession = {
      playerId: session.playerId || generateId(),
      displayName: trimmedName,
    };
    write(nextSession);
    debugLog('player-session', 'saved displayName', trimmedName);
    setSession(nextSession);
  };

  return { ...session, ready, setDisplayName };
}
