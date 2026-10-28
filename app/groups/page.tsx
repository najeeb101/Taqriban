import type { Metadata } from 'next';
import { GroupsScreen } from '@/components/social/GroupsScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.myGroups} — ${t.common.appName}` };

export default function GroupsPage() {
  return <GroupsScreen />;
}
