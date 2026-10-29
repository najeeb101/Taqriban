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
import { QuestionTabs } from './QuestionTabs';
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
    <p className="font-display text-base font-semibold text-hero-ink md:text-lg">
      {fmtNode(t.game.puzzleNumber, { n: <Num>{formatNumber(puzzle.number, digitStyle)}</Num> })}
      {' · '}
      {formatDateAr(puzzle.publish_date, digitStyle)}
    </p>
  );
  // «س١ [icon]  س٢ [icon]  س٣ [icon]» preview of today's topics; answered ones show a check.
  const questionRow = (
    <QuestionTabs
      preview
      questions={puzzle.questions}
      revealedIds={puzzle.reveals.map((r) => r.question_id)}
      currentIndex={null}
    />
  );
  // Flat maroon card: wordmark + issue number on top, then the state-specific content.
  const heroTop = (
    <div className="flex w-full items-center justify-between font-display text-xl font-semibold md:text-2xl">
      <span>{t.common.appName}</span>
      <span>{fmtNode(t.game.issueNumber, { n: <Num>{formatNumber(puzzle.number, digitStyle)}</Num> })}</span>
    </div>
  );

  if (!finished) {
    return (
      <section className="flex flex-col items-center rounded-[2rem] bg-hero px-6 pt-6 pb-9 text-center text-hero-ink shadow-card md:min-h-[calc(100dvh-7.5rem)] md:justify-between md:rounded-[2.5rem] md:px-12 md:pt-[clamp(1.25rem,4.5dvh,2rem)] md:pb-[clamp(1.25rem,4.5dvh,3rem)]">
        {heroTop}
        <div className="mt-10 flex flex-col items-center md:mt-0">
          <h1 className="font-display text-[3.75rem] leading-[1.1] font-bold md:text-[clamp(2.75rem,9dvh,5rem)]">
            {t.game.homeHeadline}
            <span className="mt-1 block -rotate-3 font-script text-[4rem] leading-[1.3] text-sand md:text-[clamp(3rem,9.5dvh,5.25rem)]">
              {t.game.homeHeadlineAccent}
            </span>
          </h1>
          <p className="mt-4 max-w-[22rem] text-[0.95rem] leading-relaxed text-hero-ink/85 md:mt-[clamp(0.5rem,2dvh,1.5rem)] md:max-w-[30rem] md:text-lg">
            {t.common.tagline}
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 md:mt-0">
          {dateLine}
          {questionRow}
        </div>
        <ButtonLink href="/play" variant="onHero" size="lg" className="mt-8 px-10 text-xl md:mt-0 md:min-h-[clamp(3.25rem,8dvh,4rem)] md:px-12 md:text-[clamp(1.25rem,3dvh,1.5rem)]">
          {done > 0 ? t.game.continuePuzzle : t.game.play}
          <span aria-hidden="true">←</span>
        </ButtonLink>
      </section>
    );
  }

  const score = results?.score ?? puzzle.daily_score;
  const topPct = results?.top_pct ?? null;
  const rows = results ? [...results.rows].sort((a, b) => a.position - b.position) : [];

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col items-center gap-3 rounded-[2rem] bg-hero px-6 pt-6 pb-8 text-center text-hero-ink shadow-card">
        {heroTop}
        <p className="mt-6 font-script text-2xl text-sand">{t.game.finishedToday}</p>
        {dateLine}
        {questionRow}
        {score !== null ? (
          <>
            <p className="font-display text-7xl leading-tight font-bold text-sand">
              <Num>{formatMultiple(score, digitStyle)}</Num>
            </p>
            <p className="font-display text-2xl font-bold">
              <span aria-hidden="true">{squareFor(score)} </span>
              {t.game.tiers[tier(score)]}
            </p>
            <p className="text-hero-ink/85">
              {results
                ? topPct !== null
                  ? fmtNode(t.game.topPct, { p: <Num>{localizeDigits(topPct, digitStyle)}%</Num> })
                  : t.game.notEnough
                : ''}
            </p>
          </>
        ) : null}
      </section>
      <Card as="section" padding="md" className="flex flex-col items-center gap-4 text-center">
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
    </div>
  );
}
