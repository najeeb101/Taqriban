'use client';
// GameFlow — the whole play experience for /play (today) and /play/[puzzleNo] (archive).
// Props: puzzleNo? (omit for today's puzzle).
// State machine (PLAN §7.1): load -> INPUT(q) -> REVEAL(q) -> ... -> RESULTS. On load it jumps to the first unguessed
// question, or straight to RESULTS when the puzzle is already complete. Results has tabs to re-open each question's reveal.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { ApiError, getPuzzle, getResults, submitGuess } from '@/lib/api';
import { track } from '@/lib/analytics';
import { formatDateAr, formatNumber } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import type { PuzzleState, Results, Reveal } from '@/lib/types';
import { ProgressDots } from './ProgressDots';
import { QuestionCard } from './QuestionCard';
import { RevealCard } from './RevealCard';
import { ResultsView } from './ResultsView';
import { fmtNode } from './richText';

type Stage = { kind: 'input'; index: number } | { kind: 'reveal'; index: number } | { kind: 'results' };
type Tab = 'summary' | `q${number}`;

export function GameFlow({ puzzleNo }: { puzzleNo?: number }) {
  const { digitStyle } = usePrefs();
  const { refreshProfile } = usePlayer();
  const { toast } = useToast();

  const [load, setLoad] = useState<{ status: 'loading' | 'ready' | 'empty' | 'error'; error?: unknown }>({
    status: 'loading',
  });
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [reveals, setReveals] = useState<Record<number, Reveal>>({});
  const [stage, setStage] = useState<Stage>({ kind: 'results' });
  const [tab, setTab] = useState<Tab>('summary');
  const [submitting, setSubmitting] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [results, setResults] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; data?: Results; error?: unknown }>({
    status: 'idle',
  });

  const submittingRef = useRef(false);
  const resultsRequested = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const initialStage = useCallback((p: PuzzleState, map: Record<number, Reveal>): Stage => {
    const idx = p.questions.findIndex((q) => !map[q.id]);
    return idx === -1 ? { kind: 'results' } : { kind: 'input', index: idx };
  }, []);

  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => {
    setLoad({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPuzzle(puzzleNo)
      .then((p) => {
        if (cancelled) return;
        if (!p || p.questions.length === 0) {
          setPuzzle(null);
          setLoad({ status: 'empty' });
          return;
        }
        const map: Record<number, Reveal> = {};
        for (const r of p.reveals) map[r.question_id] = r;
        setPuzzle(p);
        setReveals(map);
        setStage(initialStage(p, map));
        setTab('summary');
        setResults({ status: 'idle' });
        resultsRequested.current = null;
        setLoad({ status: 'ready' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // A not-live puzzle may be reported as an error rather than null.
        if (e instanceof ApiError && (e.code === 'puzzle_not_live' || e.code === 'not_found')) {
          setPuzzle(null);
          setLoad({ status: 'empty' });
        } else setLoad({ status: 'error', error: e });
      });
    return () => {
      cancelled = true;
    };
  }, [puzzleNo, initialStage, nonce]);

  const loadResults = useCallback(
    (p: PuzzleState, finishedNow: boolean) => {
      getResults(p.puzzle_id)
        .then((data) => {
          setResults({ status: 'ready', data });
          if (finishedNow) {
            track('finish');
            void refreshProfile();
          }
        })
        .catch((error: unknown) => setResults({ status: 'error', error }));
    },
    [refreshProfile],
  );

  const startResults = useCallback(
    (p: PuzzleState, finishedNow: boolean) => {
      resultsRequested.current = p.puzzle_id;
      setResults({ status: 'loading' });
      loadResults(p, finishedNow);
    },
    [loadResults],
  );

  // Entering RESULTS (e.g. page load of an already-finished puzzle) fetches the results once.
  useEffect(() => {
    if (stage.kind === 'results' && puzzle && results.status === 'idle' && resultsRequested.current !== puzzle.puzzle_id) {
      resultsRequested.current = puzzle.puzzle_id;
      loadResults(puzzle, false);
    }
  }, [stage.kind, puzzle, results.status, loadResults]);

  // Focus + scroll management after the user moves between stages.
  const stageKey = `${stage.kind}-${'index' in stage ? stage.index : ''}-${tab}`;
  useEffect(() => {
    if (!interacted || stage.kind === 'input') return;
    window.scrollTo({ top: 0 });
    const id = window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(id);
  }, [stageKey, interacted, stage.kind]);

  const doneCount = useMemo(() => (puzzle ? puzzle.questions.filter((q) => reveals[q.id]).length : 0), [puzzle, reveals]);

  async function lock(index: number, guess: number) {
    if (!puzzle || submittingRef.current) return;
    const q = puzzle.questions[index];
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await submitGuess(q.id, guess);
      const next = { ...reveals, [q.id]: res };
      if (doneCount === 0 && !res.already_guessed) track('lock_q1');
      setReveals(next);
      setInteracted(true);
      const complete = puzzle.questions.every((x) => next[x.id]);
      if (complete && results.status === 'idle') startResults(puzzle, !res.already_guessed);
      setStage({ kind: 'reveal', index });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      toast(code === 'network' || !code ? t.game.submitFailed : errorMessage(code), { tone: 'error' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function afterReveal() {
    if (!puzzle) return;
    setInteracted(true);
    setStage(initialStage(puzzle, reveals));
    setTab('summary');
  }

  // ---------------------------------------------------------------- render
  if (load.status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted">
        <Spinner size={32} />
        <p>{t.game.loadingPuzzle}</p>
      </div>
    );
  }
  if (load.status === 'error') {
    return <ErrorState error={load.error} onRetry={reload} className="py-12" />;
  }
  if (load.status === 'empty' || !puzzle) {
    return (
      <EmptyState
        icon="calc"
        title={puzzleNo === undefined ? t.game.noPuzzleTitle : t.game.puzzleNotFoundTitle}
        description={puzzleNo === undefined ? t.game.noPuzzleBody : t.game.puzzleNotFoundBody}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/archive" variant="secondary">
              {t.game.browseArchive}
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              {t.game.backHome}
            </ButtonLink>
          </div>
        }
      />
    );
  }

  const total = puzzle.questions.length;
  const current = stage.kind === 'input' ? stage.index : null;

  const header = (
    <div className="flex flex-col gap-4">
      {!puzzle.is_daily ? (
        <Card tone="accent" padding="sm" className="flex items-center gap-2 text-sm" role="note">
          <Icon name="archive" size={18} className="shrink-0 text-accent" />
          <span>{t.game.archiveBanner}</span>
        </Card>
      ) : null}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted">
          {fmtNode(t.game.puzzleNumber, { n: <Num>{formatNumber(puzzle.number, digitStyle)}</Num> })}
          {' · '}
          {formatDateAr(puzzle.publish_date, digitStyle)}
        </p>
        <ProgressDots total={total} done={doneCount} current={current} />
      </div>
    </div>
  );

  if (stage.kind === 'input') {
    const q = puzzle.questions[stage.index];
    return (
      <div className="flex flex-col gap-5">
        {header}
        <QuestionCard
          key={q.id}
          question={q}
          index={stage.index}
          total={total}
          submitting={submitting}
          autoFocus={interacted}
          onLock={(g) => lock(stage.index, g)}
        />
      </div>
    );
  }

  if (stage.kind === 'reveal') {
    const q = puzzle.questions[stage.index];
    const reveal = reveals[q.id];
    const hasNext = puzzle.questions.some((x) => !reveals[x.id]);
    return (
      <div className="flex flex-col gap-5">
        {header}
        {reveal ? (
          <RevealCard
            key={q.id}
            reveal={reveal}
            question={q}
            nextLabel={hasNext ? t.game.nextQuestion : t.game.seeResult}
            onNext={afterReveal}
            headingRef={headingRef}
          />
        ) : null}
      </div>
    );
  }

  // RESULTS
  const tabItems = [
    { value: 'summary' as Tab, label: t.game.resultsTab },
    ...puzzle.questions.map((_, i) => ({
      value: `q${i}` as Tab,
      label: fmtNode(t.game.questionTab, { i: <Num>{formatNumber(i + 1, digitStyle)}</Num> }),
    })),
  ];
  const reviewIdx = tab === 'summary' ? -1 : Number(tab.slice(1));

  return (
    <div className="flex flex-col gap-5">
      {header}
      <Tabs
        items={tabItems}
        value={tab}
        onChange={setTab}
        ariaLabel={t.game.tabsLabel}
        idPrefix="results"
      />
      <div role="tabpanel" aria-labelledby={`results-tab-${tab}`} className="flex flex-col gap-5">
        {reviewIdx >= 0 && puzzle.questions[reviewIdx] && reveals[puzzle.questions[reviewIdx].id] ? (
          <RevealCard
            key={puzzle.questions[reviewIdx].id}
            reveal={reveals[puzzle.questions[reviewIdx].id]}
            question={puzzle.questions[reviewIdx]}
            nextLabel={t.game.backToResults}
            onNext={() => setTab('summary')}
            headingRef={headingRef}
            animate={false}
          />
        ) : results.status === 'ready' && results.data ? (
          <ResultsView
            results={results.data}
            headingRef={headingRef}
            onReview={(i) => {
              setInteracted(true);
              setTab(`q${i}`);
            }}
          />
        ) : results.status === 'error' ? (
          <ErrorState error={results.error} onRetry={() => startResults(puzzle, false)} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-muted">
            <Spinner size={30} />
            <p>{t.game.resultsLoading}</p>
          </div>
        )}
      </div>
    </div>
  );
}
