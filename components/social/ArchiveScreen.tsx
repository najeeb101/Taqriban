'use client';
// ArchiveScreen — /archive: past puzzles with my status; links to /play (today) or /play/N.
import Link from 'next/link';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { getArchive } from '@/lib/api';
import { formatDateAr, formatMultiple, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { TIER_SQUARE, tier } from '@/lib/scoring';
import type { ArchiveItem } from '@/lib/types';
import { cn } from '@/components/ui/cn';
import { useAsync } from './useAsync';

function Item({ item }: { item: ArchiveItem }) {
  const { digitStyle } = usePrefs();
  const href = item.is_today ? '/play' : `/play/${item.number}`;
  const finished = item.score != null;
  const inProgress = !finished && item.answered > 0;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'flex min-h-16 items-center gap-3 rounded-2xl border bg-surface p-4 no-underline shadow-card transition',
          'hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          item.is_today ? 'border-accent/50' : 'border-line',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-medium text-ink">
              {localizeDigits(fmt(t.social.archivePage.puzzleNo, { n: item.number }), digitStyle)}
            </span>
            {item.is_today ? <Chip tone="accent">{t.social.archivePage.today}</Chip> : null}
          </span>
          <span className="text-sm text-muted">{formatDateAr(item.publish_date, digitStyle)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 text-end">
          {finished && item.score != null ? (
            <>
              <span className="font-bold text-ink">
                <span aria-hidden="true" className="me-1.5">
                  {TIER_SQUARE[tier(item.score)]}
                </span>
                <Num>{formatMultiple(item.score, digitStyle)}</Num>
              </span>
              {item.played_daily === false ? <Chip>{t.social.archivePage.fromArchive}</Chip> : null}
            </>
          ) : inProgress ? (
            <span className="text-sm text-tier-orange">
              {localizeDigits(
                fmt(t.social.archivePage.inProgress, { done: item.answered, total: item.total }),
                digitStyle,
              )}
            </span>
          ) : (
            <span className="text-sm text-muted">{t.social.archivePage.notPlayed}</span>
          )}
        </span>
        <Icon name="chevron" size={20} className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

export function ArchiveScreen() {
  const { data, error, loading, reload } = useAsync('archive', getArchive);
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">{t.social.archivePage.title}</h1>
        <p className="text-muted">{t.social.archivePage.intro}</p>
      </header>
      <p className="flex gap-2 rounded-xl border border-line bg-ink/5 p-3 text-sm text-muted">
        <Icon name="info" size={18} className="mt-1 shrink-0" />
        <span>{t.social.archivePage.note}</span>
      </p>
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} message={t.social.archivePage.loadError} onRetry={reload} />
      ) : data.length === 0 ? (
        <EmptyState icon="archive" title={t.social.archivePage.emptyTitle} description={t.social.archivePage.emptyBody} />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((item) => (
            <Item key={item.puzzle_id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
