import type { Metadata } from 'next';
import { AdminScreen } from '@/components/admin/AdminScreen';
import { t } from '@/lib/i18n';

// Private: not linked from the menu and kept out of search engines. Access is enforced server-side (admin_* RPCs).
export const metadata: Metadata = {
  title: `${t.admin.title} — ${t.common.appName}`,
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminScreen />;
}
