import { notFound } from 'next/navigation';
import BetaPreview from '@/components/game/BetaPreview';
// Development-only browser harness. Production always returns 404; no sessions,
// service keys, real player records, or network write paths are available here.
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <BetaPreview />;
}
