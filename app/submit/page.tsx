import type { Metadata } from 'next';
import { SubmitScreen } from '@/components/social/SubmitScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.submitQuestion} — ${t.common.appName}` };

export default function Page() {
  return <SubmitScreen />;
}
