'use client';
// LeaderboardScreen — the /leaderboard page body: filter chips (all / my university / my groups) + LeaderboardPanel.
// Reads ?group=<id> to preselect a group filter. Wrap in <Suspense> (uses useSearchParams).
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { cn } from '@/components/ui/cn';
import { getMyGroups } from '@/lib/api';
import { t } from '@/lib/i18n';
import { universityName } from '@/lib/universities';
import { LeaderboardPanel } from './LeaderboardPanel';
import { useAsync } from './useAsync';

type Filter = { kind: 'all' } | { kind: 'uni' } | { kind: 'group'; id: string };

function chipClass(active: boolean) {
  return cn(
    'inline-flex min-h-11 items-center rounded-full border px-4 text-[0.9375rem] font-medium transition',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:border-ink/40',
  );
}

export function LeaderboardScreen() {
  const params = useSearchParams();
  const initialGroup = params.get('group');
  const { profile, authState } = usePlayer();
  const groups = useAsync('my-groups', getMyGroups);
  const [filter, setFilter] = useState<Filter>(initialGroup ? { kind: 'group', id: initialGroup } : { kind: 'all' });

  const university = profile?.university ?? null;
  const active: Filter = filter.kind === 'uni' && !university ? { kind: 'all' } : filter;
  const groupId = active.kind === 'group' ? active.id : undefined;
  const uniFilter = active.kind === 'uni' && university ? university : undefined;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">{t.social.leaderboard}</h1>

      <div role="group" aria-label={t.social.lb.filterLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          className={chipClass(active.kind === 'all')}
          aria-pressed={active.kind === 'all'}
          onClick={() => setFilter({ kind: 'all' })}
        >
          {t.social.lb.filterAll}
        </button>
        {university ? (
          <button
            type="button"
            className={chipClass(active.kind === 'uni')}
            aria-pressed={active.kind === 'uni'}
            title={universityName(university)}
            onClick={() => setFilter({ kind: 'uni' })}
          >
            {t.social.lb.filterUniversity}
          </button>
        ) : null}
        {(authState?.isAnonymous ? [] : (groups.data ?? [])).map((g) => (
          <button
            key={g.id}
            type="button"
            className={cn(chipClass(active.kind === 'group' && active.id === g.id), 'whitespace-nowrap')}
            aria-pressed={active.kind === 'group' && active.id === g.id}
            onClick={() => setFilter({ kind: 'group', id: g.id })}
          >
            {g.name}
          </button>
        ))}
      </div>

      {!university && profile ? (
        <p className="text-sm text-muted">
          {t.social.lb.noUniversityHint}{' '}
          <Link href="/profile" className="font-medium text-accent underline underline-offset-4">
            {t.social.lb.noUniversityLink}
          </Link>
        </p>
      ) : null}

      <LeaderboardPanel
        groupId={groupId}
        university={uniFilter}
        idPrefix="lb"
        key={groupId ? `g-${groupId}` : 'main'}
      />
    </div>
  );
}
