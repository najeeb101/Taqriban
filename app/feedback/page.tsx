import type { Metadata } from 'next';
import { FeedbackScreen } from '@/components/social/FeedbackScreen';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: `${t.social.feedback.title} — ${t.common.appName}` };

export default function Page() {
  return <FeedbackScreen />;
}
