'use client';
// HomeHero — top of the home page. Loads today's puzzle and shows one of: loading, error (retry), no-puzzle empty state,
// "play / continue" hero with progress dots, or the finished state (score, tier, Top %, countdown, share, results link).
import { useCallback, useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { getPuzzle, getResults } from '@/lib/api';
import { formatDateAr, formatMultiple, formatNumber, localizeDigits } from '@/lib/format';
import { t } from '@/lib/i18n';
import { squareFor, tier } from '@/lib/scoring';
import type { PuzzleState, Results } from '@/lib/types';
import { Countdown } from './Countdown';
import { ProgressDots } from './ProgressDots';
import { ShareButtons } from './ShareButtons';
import { fmtNode } from './richText';

export function HomeHero() {
  const { digitStyle } = usePrefs();
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'empty' | 'error'; error?: unknown }>({
    status: 'loading',
  });
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [results, setResults] = useState<Results | null>(null);

  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPuzzle()
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          setPuzzle(null);
          setState({ status: 'empty' });
          return;
        }
        setPuzzle(p);
        setState({ status: 'ready' });
        const finished = p.daily_score !== null || p.reveals.length >= p.questions.length;
        if (finished) {
          getResults(p.puzzle_id)
            .then((r) => {
              if (!cancelled) setResults(r);
            })
            .catch(() => {
              /* share + percentile are optional on the home page */
            });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: e });
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  if (state.status === 'loading') {
    return (
      <Card padding="lg" className="flex min-h-56 flex-col items-center justify-center gap-3 text-muted">
        <Spinner size={30} />
        <p>{t.game.loadingPuzzle}</p>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <Card padding="md">
        <ErrorState error={state.error} onRetry={retry} />
      </Card>
    );
  }
  if (state.status === 'empty' || !puzzle) {
    return (
      <Card padding="md">
        <EmptyState
          icon="calc"
          title={t.game.noPuzzleTitle}
          description={t.game.noPuzzleBody}
          action={
            <ButtonLink href="/archive" variant="secondary">
              {t.game.browseArchive}
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const total = puzzle.questions.length;
  const done = puzzle.reveals.length;
  const finished = puzzle.daily_score !== null || done >= total;
  const dateLine = (
    <p className="text-sm text-muted">
      {fmtNode(t.game.puzzleNumber, { n: <Num>{formatNumber(puzzle.number, digitStyle)}</Num> })}
      {' · '}
      {formatDateAr(puzzle.publish_date, digitStyle)}
    </p>
  );

  if (!finished) {
    return (
      <Card as="section" padding="lg" className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm font-medium text-accent">{t.game.homeHeroKicker}</p>
        <h1 className="font-display text-5xl leading-tight">{t.common.appName}</h1>
        <p className="text-muted">{t.common.tagline}</p>
        <div className="flex flex-col items-center gap-3">
          {dateLine}
          <ProgressDots total={total} done={done} />
        </div>
        <ButtonLink href="/play" size="lg" fullWidth>
          {done > 0 ? t.game.continuePuzzle : t.game.play}
        </ButtonLink>
      </Card>
    );
  }

  const score = results?.score ?? puzzle.daily_score;
  const topPct = results?.top_pct ?? null;
  const rows = results ? [...results.rows].sort((a, b) => a.position - b.position) : [];

  return (
    <Card as="section" padding="lg" className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm font-medium text-accent">{t.game.finishedToday}</p>
      {dateLine}
      <ProgressDots total={total} done={done} />
      {score !== null ? (
        <>
          <p className="text-6xl leading-tight font-bold text-accent">
            <Num>{formatMultiple(score, digitStyle)}</Num>
          </p>
          <p className="text-2xl font-bold">
            <span aria-hidden="true">{squareFor(score)} </span>
            {t.game.tiers[tier(score)]}
          </p>
          <p className="text-muted">
            {results
              ? topPct !== null
                ? fmtNode(t.game.topPct, { p: <Num>{localizeDigits(topPct, digitStyle)}%</Num> })
                : t.game.notEnough
              : ''}
          </p>
        </>
      ) : null}
      <Countdown />
      {results && rows.length > 0 ? (
        <ShareButtons
          className="w-full"
          puzzleNo={results.number}
          score={results.score}
          topPct={results.top_pct}
          rows={rows.map((r) => ({ multiple: r.multiple, direction: r.direction }))}
        />
      ) : null}
      <ButtonLink href="/play" variant="secondary" fullWidth>
        {t.game.viewResults}
      </ButtonLink>
    </Card>
  );
}
