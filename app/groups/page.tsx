import type { Metadata } from 'next';
import { GroupsScreen } from '@/components/social/GroupsScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.common.appName}: ${t.social.myGroups}` };

export default function GroupsPage() {
  return <GroupsScreen />;
}
