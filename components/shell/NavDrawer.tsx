'use client';
// NavDrawer — side menu (a Sheet from the inline-end edge). Focus trap + Esc come from Sheet.
// Props: open, onClose. Links close the drawer on click; the current route is highlighted (aria-current).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/components/ui/cn';

const ITEMS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: '/', label: t.common.nav.today, icon: 'target', match: (p) => p === '/' || p.startsWith('/play') },
  { href: '/archive', label: t.common.nav.archive, icon: 'archive', match: (p) => p.startsWith('/archive') },
  { href: '/leaderboard', label: t.common.nav.leaderboard, icon: 'trophy', match: (p) => p.startsWith('/leaderboard') },
  { href: '/groups', label: t.common.nav.groups, icon: 'users', match: (p) => p.startsWith('/groups') },
  { href: '/profile', label: t.common.nav.profile, icon: 'user', match: (p) => p.startsWith('/profile') },
  { href: '/submit', label: t.common.nav.submit, icon: 'lightbulb', match: (p) => p.startsWith('/submit') },
  { href: '/feedback', label: t.common.nav.feedback, icon: 'message', match: (p) => p.startsWith('/feedback') },
  { href: '/settings', label: t.common.nav.settings, icon: 'settings', match: (p) => p.startsWith('/settings') },
];

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? '/';
  return (
    <Sheet open={open} onClose={onClose} title={t.common.nav.menu} side="end">
      <nav aria-label={t.common.nav.mainNav}>
        <ul className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[1.0625rem] font-medium no-underline transition',
                    active ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-ink/5',
                  )}
                >
                  <Icon name={item.icon} size={22} />
                  <span className="flex-1">{item.label}</span>
                  <Icon name="chevron" size={16} className="opacity-40" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </Sheet>
  );
}
