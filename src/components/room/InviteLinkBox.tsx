'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function InviteLinkBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/room/${code}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — show url for manual copy */
    }
  };
  return (
    <div className="panel rounded-md p-3 flex items-center gap-3">
      <div className="font-mono text-xs text-white/40">ROOM</div>
      <div className="font-display tracking-[0.3em] text-ko-gold neon-text text-xl">{code}</div>
      <div className="hidden md:block mx-2 h-5 w-px bg-white/10" />
      <code className="hidden md:block flex-1 truncate text-xs text-white/60 font-mono">{url || `/room/${code}`}</code>
      <button onClick={copy} className={cn('btn-secondary text-xs', copied && 'text-ko-gold border-ko-gold/50 bg-ko-gold/10')}>
        {copied ? 'Copied!' : 'Copy invite'}
      </button>
    </div>
  );
}
