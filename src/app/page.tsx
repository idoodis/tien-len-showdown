import { LandingClient } from '@/features/landing/LandingClient';

// Skip static prerender — landing depends on browser storage / window.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <LandingClient />;
}
