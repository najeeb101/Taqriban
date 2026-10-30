'use client';
// ResultsView — the RESULTS stage.
// Props: results (Results), onReview(index) (open that question's reveal), headingRef?.
// Big score + tier, «أفضل P%» or not-enough note, ScoreDistribution, per-question rows, share actions,
// guest-only «save your streak» nudge (→ /profile account card), links, countdown.
import type { Ref } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatMultiple, formatNumber, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { squareFor, tier } from '@/lib/scoring';
import type { Results } from '@/lib/types';
import { Countdown } from './Countdown';
import { ScoreDistribution } from './ScoreDistribution';
import { ShareButtons } from './ShareButtons';
import { fmtNode } from './richText';
import { multipleNumber } from './RevealCard';

export function ResultsView({
  results,
  onReview,
  headingRef,
}: {
  results: Results;
  onReview: (index: number) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const { digitStyle } = usePrefs();
  const { authState } = usePlayer();
  const rows = [...results.rows].sort((a, b) => a.position - b.position);
  const tr = tier(results.score);
  const shareRows = rows.map((r) => ({ multiple: r.multiple, direction: r.direction }));

  return (
    <div className="flex flex-col gap-5">
      <Card as="section" padding="lg" className="flex flex-col items-center gap-3 text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-medium text-muted outline-none">
          {t.game.dailyScore}
        </h2>
        <p className="text-6xl font-bold leading-tight text-accent">
          <Num>{formatMultiple(results.score, digitStyle)}</Num>
        </p>
        <p className="text-2xl font-bold">
          <span aria-hidden="true">{squareFor(results.score)} </span>
          {t.game.tiers[tr]}
        </p>
        <p className="text-muted">
          {results.top_pct !== null
            ? fmtNode(t.game.topPct, { p: <Num>{localizeDigits(results.top_pct, digitStyle)}%</Num> })
            : t.game.notEnough}
        </p>
        {!results.is_daily ? <p className="text-sm text-muted">{t.game.archivePlayNote}</p> : null}
        {results.players > 0 ? (
          <p className="text-sm text-muted">
            {fmtNode(t.game.playersToday, { n: <Num>{formatNumber(results.players, digitStyle)}</Num> })}
          </p>
        ) : null}
      </Card>

      <Card as="section" padding="lg">
        <ScoreDistribution bins={results.distribution} myBin={results.my_bin} />
      </Card>

      <Card as="section" padding="md" className="flex flex-col gap-1">
        <h3 className="px-2 pt-1 pb-2 text-lg">{t.game.rowsHeading}</h3>
        <ol className="m-0 flex list-none flex-col p-0">
          {rows.map((r, i) => {
            const rt = tier(r.multiple);
            return (
              <li key={r.question_id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  onClick={() => onReview(i)}
                  aria-label={fmt(t.game.reviewRow, { i: formatNumber(r.position, digitStyle) })}
                  className="flex min-h-16 w-full items-center gap-3 rounded-lg px-2 py-3 text-start hover:bg-ink/5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-sm font-medium">
                    <Num>{formatNumber(r.position, digitStyle)}</Num>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 text-[0.9375rem] leading-snug">
                      {localizeDigits(r.text, digitStyle)}
                    </span>
                    <span className="text-sm text-muted">
                      {fmtNode(t.game.rowGuessAnswer, {
                        g: <Num>{formatNumber(r.guess, digitStyle)}</Num>,
                        a: <Num>{formatNumber(r.answer, digitStyle)}</Num>,
                      })}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-end">
                    <span className="text-lg font-bold">
                      <Num>{multipleNumber(r.direction === 'exact' ? 1 : r.multiple, digitStyle)}×</Num>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-muted">
                      {r.direction === 'exact' ? (
                        <Icon name="target" size={14} />
                      ) : (
                        <Icon name={r.direction === 'low' ? 'arrowDown' : 'arrowUp'} size={14} />
                      )}
                      {t.game.directionWord[r.direction]}
                      <span aria-hidden="true">{squareFor(r.multiple)}</span>
                      <span className="sr-only">{t.game.tiers[rt]}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <ShareButtons puzzleNo={results.number} score={results.score} topPct={results.top_pct} rows={shareRows} isDaily={results.is_daily} />

      {authState?.isAnonymous ? (
        <section aria-labelledby="save-streak-title" className="flex flex-col gap-4 rounded-3xl bg-hero p-5 text-hero-ink shadow-card">
          <div className="flex gap-3">
            <Icon name="flame" size={22} filled className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <h3 id="save-streak-title" className="text-lg">
                {t.game.saveStreakTitle}
              </h3>
              <p className="text-sm text-hero-ink/80">{t.game.saveStreakBody}</p>
            </div>
          </div>
          <ButtonLink href="/profile#account" variant="onHero" fullWidth>
            {t.game.saveStreakButton}
          </ButtonLink>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/leaderboard" variant="secondary">
          <Icon name="trophy" />
          {t.game.leaderboardLink}
        </ButtonLink>
        <ButtonLink href="/groups" variant="secondary">
          <Icon name="users" />
          {t.game.groupsLink}
        </ButtonLink>
      </div>

      {results.is_daily ? <Countdown className="pt-2" /> : null}
    </div>
  );
}
