import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/social/ProfileScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.common.appName}: ${t.social.profile}` };

export default function Page() {
  return <ProfileScreen />;
}
