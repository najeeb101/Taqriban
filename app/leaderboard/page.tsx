import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeaderboardScreen } from '@/components/social/LeaderboardScreen';
import { Spinner } from '@/components/ui/Spinner';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.leaderboard} — ${t.common.appName}` };

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size={32} /></div>}>
      <LeaderboardScreen />
    </Suspense>
  );
}
