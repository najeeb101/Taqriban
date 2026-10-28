import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/social/ProfileScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.profile} — ${t.common.appName}` };

export default function Page() {
  return <ProfileScreen />;
}
