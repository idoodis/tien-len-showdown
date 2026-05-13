'use client';

import { useSettings } from '@/features/settings/useSettings';
import { usePlayerSession } from '@/features/player-session/usePlayerSession';

export function SettingsClient() {
  const settings = useSettings();
  const session = usePlayerSession();

  return (
    <div className="space-y-5 max-w-2xl">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-ko-blue">preferences</p>
        <h1 className="font-display tracking-widest text-5xl neon-text">SETTINGS</h1>
      </header>

      <section className="panel rounded-md p-5 space-y-4">
        <Row label="Animation intensity">
          <select
            value={settings.animation}
            onChange={(e) => settings.setAnimation(e.target.value as 'full' | 'reduced' | 'minimal')}
            className="rounded-md border border-white/10 bg-arena-0 px-3 py-1.5 font-mono uppercase text-xs"
          >
            <option value="full">Full</option>
            <option value="reduced">Reduced</option>
            <option value="minimal">Minimal</option>
          </select>
        </Row>
        <Row label="Sound effects">
          <Toggle checked={settings.sound} onChange={settings.setSound} />
        </Row>
        <Row label="Auto-submit queued moves">
          <Toggle checked={settings.autoSubmitQueued} onChange={settings.setAutoSubmit} />
        </Row>
        <Row label="Display name">
          <input
            defaultValue={session.displayName ?? ''}
            onBlur={(e) => session.setDisplayName(e.target.value.trim())}
            maxLength={20}
            placeholder="Pick a name"
            className="rounded-md border border-white/10 bg-arena-0 px-3 py-1.5 font-mono uppercase text-xs"
          />
        </Row>
      </section>

      <p className="text-xs text-white/40">
        Settings are stored in your browser only. Clearing site data resets them.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-mono text-xs uppercase tracking-widest text-white/60">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? 'bg-ko-blue/70' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}
