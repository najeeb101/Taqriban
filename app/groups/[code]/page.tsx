import type { Metadata } from 'next';
import { GroupScreen } from '@/components/social/GroupScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.common.appName}: ${t.social.myGroup}` };

export default function GroupPage() {
  return <GroupScreen />;
}
