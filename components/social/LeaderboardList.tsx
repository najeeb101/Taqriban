'use client';
// LeaderboardList — presentational ranked list.
// Props: board (Leaderboard), scope (LeaderboardScope), className?
// Ranked rows first, then unranked group members (greyed), `me` pinned below when not visible. Highlights my row.
import { Num } from '@/components/ui/Num';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatMultiple, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { TIER_SQUARE, tier } from '@/lib/scoring';
import type { Leaderboard, LeaderboardEntry, LeaderboardScope } from '@/lib/types';
import { splitBoard, universityLabel } from './utils';

function Row({ e, scope, muted = false }: { e: LeaderboardEntry; scope: LeaderboardScope; muted?: boolean }) {
  const { digitStyle } = usePrefs();
  const uni = universityLabel(e.university);
  let main: string | null = null;
  let sub: string | null = null;
  let square = '';
  if (scope === 'streak') {
    main = e.streak != null ? localizeDigits(fmt(t.social.lb.streakDays, { n: e.streak }), digitStyle) : null;
  } else if (e.score != null) {
    main = formatMultiple(e.score, digitStyle);
    square = TIER_SQUARE[tier(e.score)];
    if (scope !== 'day' && e.days != null) sub = localizeDigits(fmt(t.social.lb.daysCount, { n: e.days }), digitStyle);
  }
  return (
    <li
      aria-current={e.is_me ? 'true' : undefined}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2',
        e.is_me ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface',
        muted && 'opacity-60',
      )}
    >
      <span className="grid w-8 shrink-0 place-items-center text-lg font-bold text-muted">
        {e.rank != null ? <Num>{localizeDigits(e.rank, digitStyle)}</Num> : <span aria-hidden="true">–</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {e.display_name}
          {e.is_me ? <span className="ms-2 text-sm font-normal text-accent">({t.social.lb.me})</span> : null}
        </span>
        {uni ? <span className="truncate text-sm text-muted">{uni}</span> : null}
      </span>
      <span className="flex shrink-0 flex-col items-end text-end">
        {main ? (
          <span className="font-bold">
            {square ? (
              <span aria-hidden="true" className="me-1.5">
                {square}
              </span>
            ) : null}
            <Num>{main}</Num>
          </span>
        ) : (
          <span className="text-sm text-muted">{t.social.lb.unrankedGroup}</span>
        )}
        {sub ? <span className="text-xs text-muted">{sub}</span> : null}
      </span>
    </li>
  );
}

export function LeaderboardList({
  board,
  scope,
  className,
}: {
  board: Leaderboard;
  scope: LeaderboardScope;
  className?: string;
}) {
  const { ranked, unranked, pinnedMe } = splitBoard(board);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <ol className="flex flex-col gap-2">
        {ranked.map((e) => (
          <Row key={e.player_id} e={e} scope={scope} />
        ))}
      </ol>
      {unranked.length > 0 ? (
        <>
          <h3 className="mt-2 text-sm font-medium text-muted">{t.social.lb.unrankedGroup}</h3>
          <ul className="flex flex-col gap-2">
            {unranked.map((e) => (
              <Row key={e.player_id} e={e} scope={scope} muted={!e.is_me} />
            ))}
          </ul>
        </>
      ) : null}
      {pinnedMe ? (
        <div className="mt-2 border-t border-dashed border-line pt-3">
          <ul>
            <Row e={pinnedMe} scope={scope} />
          </ul>
        </div>
      ) : null}
    </div>
  );
}
