'use client';

import { useState } from 'react';

export function DisplayNameModal({
  initial,
  title = 'Enter your display name',
  cta = 'Continue',
  onSubmit,
  onCancel,
}: {
  initial?: string;
  title?: string;
  cta?: string;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial ?? '');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) return setErr('At least 1 character.');
    if (trimmed.length > 20) return setErr('Max 20 characters.');
    onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-arena-0/80 backdrop-blur">
      <form
        onSubmit={submit}
        className="panel w-full max-w-sm rounded-md p-5 space-y-4"
      >
        <h2 className="font-display text-2xl tracking-widest text-ko-gold neon-text">{title}</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="e.g. NEON_DRAGON"
          className="w-full rounded-md border border-white/10 bg-arena-0 px-3 py-2 font-mono uppercase tracking-widest outline-none focus:border-ko-blue"
        />
        {err && <p className="text-xs text-ko-red">{err}</p>}
        <div className="flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>}
          <button type="submit" className="btn-primary flex-1">{cta}</button>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          No accounts. Your name is stored locally only.
        </p>
      </form>
    </div>
  );
}
