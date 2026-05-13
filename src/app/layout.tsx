import type { Metadata } from 'next';
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Tien Len Showdown',
  description: 'A fast, free, invite-only Tiến Lên card battle. Built for the browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-arena-0/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/" className="font-display text-2xl tracking-widest text-ko-gold">
              TIEN&nbsp;LEN <span className="neon-pink">SHOWDOWN</span>
            </Link>
            <nav className="ml-auto hidden gap-4 md:flex text-xs uppercase tracking-widest">
              <Link href="/" className="text-white/60 hover:text-ko-blue">Home</Link>
              <Link href="/rules" className="text-white/60 hover:text-ko-blue">Rules</Link>
              <Link href="/settings" className="text-white/60 hover:text-ko-blue">Settings</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-white/30">
          No accounts · no payments · just cards.
        </footer>
      </body>
    </html>
  );
}
