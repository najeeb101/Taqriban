import type { Metadata } from 'next';
import { ArchiveScreen } from '@/components/social/ArchiveScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.archive} — ${t.common.appName}` };

export default function Page() {
  return <ArchiveScreen />;
}
