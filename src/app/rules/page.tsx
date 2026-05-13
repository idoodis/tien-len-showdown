// SSG of this page fails on Windows with a Next 14.2.15 chunk-load bug
// (`TypeError: e[o] is not a function`). Render dynamically — no SEO loss
// since the rules page is text-only and one-shot.
export const dynamic = 'force-dynamic';

export default function RulesPage() {
  return (
    <article className="space-y-6 max-w-3xl">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-ko-blue mb-1">manual</p>
        <h1 className="font-display tracking-widest text-5xl neon-text">HOW TO PLAY</h1>
      </header>

      <Section title="The deck">
        Standard 52-card deck. <b>2</b> is the highest rank; <b>3</b> is the lowest.
        Suit order (low → high): ♠ Spades · ♣ Clubs · ♦ Diamonds · ♥ Hearts.
      </Section>
      <Section title="The goal">
        Be the first to empty your hand. The match ends when one player still holds cards.
      </Section>
      <Section title="Legal combos">
        <ul className="list-disc list-inside text-white/80">
          <li><b>Single</b> — any one card.</li>
          <li><b>Pair</b> — two cards of the same rank.</li>
          <li><b>Triple</b> — three of the same rank.</li>
          <li><b>Straight</b> — three or more consecutive ranks, no 2s.</li>
          <li><b>Pair sequence (đôi thông)</b> — three or more consecutive pairs, no 2s.</li>
          <li><b>Four-of-a-kind (bomb)</b> — chops a single 2 or pair of 2s.</li>
        </ul>
      </Section>
      <Section title="Turn flow">
        The player holding the lowest card leads the first round (typically 3♠).
        On your turn, beat the current trick with a stronger combo of the same shape,
        or <b>pass</b>. When everyone else passes, the current controller leads a new trick.
      </Section>
      <Section title="Bomb hierarchy">
        <ul className="list-disc list-inside text-white/80">
          <li>3-pair-sequence beats a single 2.</li>
          <li>4-pair-sequence beats a pair of 2s.</li>
          <li>Four-of-a-kind beats both a single 2 and a pair of 2s.</li>
        </ul>
      </Section>
      <Section title="Queue your move">
        Tap cards while it&apos;s not your turn and hit <b>QUEUE MOVE</b>.
        When your turn arrives, your queued move is re-validated and auto-submits
        (toggle this in Settings). If the table changed, the queue clears and you pick again.
      </Section>
      <Section title="Fair play (without accounts)">
        The server holds the deck and validates every move. Other players&apos; hands
        are never shipped to your browser — you only ever see card backs and counts.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel rounded-md p-5">
      <h2 className="font-display text-2xl tracking-widest text-ko-gold">{title.toUpperCase()}</h2>
      <div className="text-sm text-white/80 mt-2">{children}</div>
    </section>
  );
}
