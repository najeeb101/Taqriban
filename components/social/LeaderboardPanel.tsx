'use client';
// LeaderboardPanel — scope tabs + fetched ranked list for one filter.
// Props: groupId?, university?, defaultScope? ('day'), idPrefix? ('lb'), onScopeChange?(scope), className?
// Handles loading, error+retry, hidden (group spoiler protection), empty states and min-days notes.
// Reuse it anywhere (the group page uses it with `groupId`).
import { useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import { fmt, t } from '@/lib/i18n';
import { localizeDigits } from '@/lib/format';
import type { LeaderboardScope } from '@/lib/types';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { LeaderboardList } from './LeaderboardList';
import { MIN_DAYS } from './utils';
import { useAsync } from './useAsync';

const SCOPES: LeaderboardScope[] = ['day', 'week', 'all', 'streak'];

export function LeaderboardPanel({
  groupId,
  university,
  defaultScope = 'day',
  idPrefix = 'lb',
  onScopeChange,
  className,
}: {
  groupId?: string;
  university?: string;
  defaultScope?: LeaderboardScope;
  idPrefix?: string;
  onScopeChange?: (scope: LeaderboardScope) => void;
  className?: string;
}) {
  const { digitStyle } = usePrefs();
  const [scope, setScope] = useState<LeaderboardScope>(defaultScope);
  const { data, error, loading, reload } = useAsync(`${scope}|${groupId ?? ''}|${university ?? ''}`, () =>
    getLeaderboard(scope, { groupId, university }),
  );

  const note =
    scope === 'week'
      ? fmt(t.social.lb.minDaysWeek, { n: MIN_DAYS.week })
      : scope === 'all'
        ? fmt(t.social.lb.minDaysAll, { n: MIN_DAYS.all })
        : scope === 'day'
          ? t.social.lb.noteDay
          : t.social.lb.noteStreak;

  function finishersText(n: number): string {
    const s =
      n <= 0 ? t.social.lb.finishersNone : n === 1 ? t.social.lb.finishersOne : fmt(t.social.lb.finishers, { n });
    return localizeDigits(s, digitStyle);
  }

  let body;
  if (loading) {
    body = (
      <div className="flex justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  } else if (error || !data) {
    body = <ErrorState error={error} onRetry={reload} />;
  } else if (data.hidden) {
    body = (
      <EmptyState
        icon="target"
        title={t.social.lb.hiddenTitle}
        description={`${t.social.lb.hiddenBody} ${finishersText(data.finishers)}`}
        action={
          <ButtonLink href="/play" size="lg">
            <Icon name="target" />
            {t.social.lb.playCta}
          </ButtonLink>
        }
      />
    );
  } else if (data.entries.length === 0 && !data.me) {
    body = (
      <EmptyState
        icon="trophy"
        title={t.social.lb.emptyTitle}
        description={scope === 'day' ? t.social.lb.emptyDay : t.social.lb.emptyOther}
        action={
          scope === 'day' ? (
            <ButtonLink href="/play" size="md">
              {t.social.lb.playCta}
            </ButtonLink>
          ) : undefined
        }
      />
    );
  } else {
    body = <LeaderboardList board={data} scope={scope} />;
  }

  return (
    <div className={className}>
      <Tabs
        ariaLabel={t.social.lb.scopeLabel}
        idPrefix={idPrefix}
        value={scope}
        onChange={(s) => {
          setScope(s);
          onScopeChange?.(s);
        }}
        items={SCOPES.map((s) => ({ value: s, label: t.social.scopes[s] }))}
      />
      <div
        role="tabpanel"
        id={`${idPrefix}-panel`}
        aria-labelledby={`${idPrefix}-tab-${scope}`}
        aria-live="polite"
        className="mt-4 flex flex-col gap-3"
      >
        {!loading && !error && data && !data.hidden ? (
          <p className="text-sm text-muted">{localizeDigits(note, digitStyle)}</p>
        ) : null}
        {body}
      </div>
    </div>
  );
}
