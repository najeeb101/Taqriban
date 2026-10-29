'use client';
// Header — sticky top bar: logo (El Messiri, links home), streak flame (when current_streak > 0), menu button.
// Props: onMenu (opens the NavDrawer), menuOpen? (aria-expanded).
import Link from 'next/link';
import { fmt, t } from '@/lib/i18n';
import { localizeDigits } from '@/lib/format';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';

export function Header({ onMenu, menuOpen = false }: { onMenu: () => void; menuOpen?: boolean }) {
  const { profile } = usePlayer();
  const { digitStyle } = usePrefs();
  const streak = profile?.current_streak ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex h-16 w-full items-center gap-2 px-4 md:px-8">
        <Link
          href="/"
          aria-label={t.common.nav.home}
          className="font-display text-[1.75rem] leading-none font-bold text-ink no-underline"
        >
          {t.common.appName}
        </Link>

        <div className="ms-auto flex items-center gap-1">
          {streak > 0 ? (
            <span
              className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 font-bold text-accent"
              title={fmt(t.common.status.streakDays, { n: localizeDigits(streak, digitStyle) })}
              aria-label={fmt(t.common.status.streakDays, { n: localizeDigits(streak, digitStyle) })}
            >
              <Icon name="flame" size={18} filled />
              <Num>{localizeDigits(streak, digitStyle)}</Num>
            </span>
          ) : null}
          <button
            type="button"
            onClick={onMenu}
            aria-label={t.common.nav.menu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="-me-2 grid size-11 place-items-center rounded-full text-ink hover:bg-ink/5"
          >
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
