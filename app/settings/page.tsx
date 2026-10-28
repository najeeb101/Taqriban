import type { Metadata } from 'next';
import { SettingsScreen } from '@/components/social/SettingsScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.settings} — ${t.common.appName}` };

export default function Page() {
  return <SettingsScreen />;
}
