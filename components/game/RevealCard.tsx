'use client';
// RevealCard — the REVEAL stage for one question.
// Props: reveal (Reveal), question (QuestionPublic), nextLabel (button text), onNext(), headingRef?, animate? (pop the chip),
//   showNext? (default true). Fetches the histogram itself (getHistogram) with a retry on failure.
// A flat maroon hero (tabs row, question, «خمّنت X» and «الإجابة Y» which counts up, a white result pill with the tier square,
// percentile / not-enough note, confetti for sniper/great) above a surface card with the log histogram, collapsible napkin math
// (Markdown) and the source link. A polite live region announces the result. Motion respects reduce-motion settings.
import { useCallback, useEffect, useState, type ReactNode, type Ref } from 'react';
import { Button } from '@/components/ui/Button';
import type { ChipTone } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Markdown } from '@/components/ui/Markdown';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { getHistogram } from '@/lib/api';
import { formatNumber, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { squareFor, tier } from '@/lib/scoring';
import type { Histogram, QuestionPublic, Reveal, Tier } from '@/lib/types';
import { Confetti } from './Confetti';
import { LogHistogram } from './LogHistogram';
import { prefersReducedMotion, useCountUp } from './motion';
import { fmtNode } from './richText';

export const TIER_TONE: Record<Tier, ChipTone> = {
  sniper: 'green',
  great: 'green',
  close: 'yellow',
  practice: 'orange',
  dark: 'red',
};

/** "12.3" / "1.45" — the multiple without the × sign (templates add it). */
export function multipleNumber(m: number, style: 'latn' | 'arab'): string {
  const digits = m < 10 ? 2 : m < 100 ? 1 : 0;
  if (m >= 1000) return `+${formatNumber(1000, style)}`;
  const f = new Intl.NumberFormat(style === 'arab' ? 'ar-EG-u-nu-arab' : 'en-u-nu-latn', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return f.format(m);
}

function safeHttpUrl(u: string): string | null {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Plain-text version of the result sentence (for the live region). */
export function resultSentence(reveal: Reveal, style: 'latn' | 'arab'): string {
  if (reveal.direction === 'exact') return t.game.exact;
  const x = `${multipleNumber(reveal.multiple, style)}×`;
  return fmt(reveal.direction === 'low' ? t.game.tooLow : t.game.tooHigh, { x });
}

export function RevealCard({
  reveal,
  question,
  nextLabel,
  onNext,
  headingRef,
  animate = true,
  showNext = true,
  tabs,
}: {
  reveal: Reveal;
  question: QuestionPublic;
  nextLabel: string;
  onNext: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  animate?: boolean;
  showNext?: boolean;
  /** QuestionTabs node for the top row of the hero (omit when reviewing from the results tabs). */
  tabs?: ReactNode;
}) {
  const { digitStyle } = usePrefs();
  const [hist, setHist] = useState<Histogram | null>(null);
  const [histState, setHistState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [announce, setAnnounce] = useState('');
  const qid = reveal.question_id;
  const motion = animate && !prefersReducedMotion();
  const shownAnswer = useCountUp(reveal.answer, motion);
  const counting = motion && shownAnswer !== reveal.answer;

  const [nonce, setNonce] = useState(0);
  const retryHist = useCallback(() => {
    setHistState('loading');
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHistogram(qid)
      .then((h) => {
        if (cancelled) return;
        setHist(h);
        setHistState('ready');
      })
      .catch(() => {
        if (!cancelled) setHistState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [qid, nonce]);

  const tr = tier(reveal.multiple);
  const exact = reveal.direction === 'exact';
  const closer =
    reveal.closer_than_pct !== null
      ? fmt(t.game.closerThan, { p: localizeDigits(reveal.closer_than_pct, digitStyle) + "%" })
      : t.game.notEnough;

  useEffect(() => {
    // Set after mount so the (already present) live region actually announces the text.
    const id = window.setTimeout(() => setAnnounce(`${resultSentence(reveal, digitStyle).replace(/[.!]+$/, "")}. ${closer}`), 150);
    return () => window.clearTimeout(id);
    // announce once per reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid]);

  const x = multipleNumber(reveal.multiple, digitStyle);
  const sourceUrl = safeHttpUrl(reveal.source_url);
  const sourceLabel = reveal.source_name || (sourceUrl ? new URL(sourceUrl).hostname : '');

  const celebrate = motion && (tr === 'sniper' || tr === 'great');
  // while counting show whole numbers; the final value is exact (may be decimal)
  const answerText = formatNumber(counting ? Math.round(shownAnswer) : reveal.answer, digitStyle);
  const dirIcon = exact ? 'target' : reveal.direction === 'low' ? 'arrowDown' : 'arrowUp';

  return (
    <section className="relative flex min-h-[calc(100dvh-7.5rem)] flex-col gap-6 overflow-hidden rounded-[2rem] bg-hero p-6 text-hero-ink shadow-card md:gap-[clamp(0.75rem,2.6dvh,1.75rem)] md:rounded-[2.5rem] md:p-[clamp(1.25rem,4.5dvh,2.5rem)]">
      {celebrate ? <Confetti /> : null}
      {tabs ? <div className="relative">{tabs}</div> : null}
      <h2 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
        {localizeDigits(question.text, digitStyle)}
      </h2>

      {/* guess -> answer ledger */}
      <div className="relative grid grid-cols-2 gap-3 md:gap-4">
        <div className="rounded-3xl bg-hero-ink/15 p-4 md:p-[clamp(0.75rem,2.4dvh,1.5rem)]">
          <p className="text-sm font-semibold text-hero-ink/80 md:text-base">{t.game.yourGuess}</p>
          <p className="mt-1 font-display text-3xl font-bold md:text-[clamp(2rem,6dvh,3rem)]">
            <Num>{formatNumber(reveal.guess, digitStyle)}</Num>
          </p>
          {question.unit ? <p className="text-sm text-hero-ink/70">{question.unit}</p> : null}
        </div>
        <div className="rounded-3xl bg-white p-4 text-hero ring-4 ring-sand md:p-[clamp(0.75rem,2.4dvh,1.5rem)]">
          <p className="text-sm font-semibold opacity-80 md:text-base">{t.game.guessedAnswerLine}</p>
          <p className="mt-1 font-display text-3xl font-bold md:text-[clamp(2rem,6dvh,3rem)]">
            <Num>{answerText}</Num>
          </p>
          {question.unit ? <p className="text-sm opacity-75">{question.unit}</p> : null}
        </div>
      </div>

      {/* result (pops in once the number has landed) + histogram */}
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,13rem)_1fr] md:gap-8">
        <div
          className={`flex flex-col gap-1 md:border-e md:border-hero-ink/25 md:pe-6 ${motion ? 'animate-pop' : ''}`}
          style={motion ? { animationDelay: '1000ms', animationFillMode: 'both' } : undefined}
        >
          <p className="font-display text-lg font-semibold text-hero-ink/85">{t.game.landedLabel}</p>
          <p className="font-display text-6xl leading-none font-bold text-sand md:text-[clamp(3rem,9dvh,4.5rem)]">
            <Num>{exact ? '1' : x}×</Num>
          </p>
          <p className="mt-1 inline-flex items-center gap-2 font-display text-2xl font-bold text-sand">
            <span aria-hidden="true">{squareFor(reveal.multiple)}</span>
            <Icon name={dirIcon} size={22} />
            <span>{exact ? t.game.exact : t.game.directionWord[reveal.direction]}</span>
          </p>
          <p className="mt-3 text-hero-ink/90">
            {reveal.closer_than_pct !== null
              ? fmtNode(t.game.closerThan, { p: <Num>{localizeDigits(reveal.closer_than_pct, digitStyle)}%</Num> })
              : t.game.notEnough}
          </p>
          <p className="text-sm text-hero-ink/75">
            {fmtNode(t.game.playersAnswered, { n: <Num>{formatNumber(reveal.players, digitStyle)}</Num> })}
          </p>
        </div>

        <div className="min-h-44 min-w-0">
          {histState === 'loading' ? (
            <div className="flex h-44 items-center justify-center gap-2 text-sm text-hero-ink/80">
              <Spinner size={18} label={t.game.histLoading} />
              <span aria-hidden="true">{t.game.histLoading}</span>
            </div>
          ) : histState === 'error' || !hist ? (
            <div className="flex h-44 flex-col items-center justify-center gap-2 text-sm text-hero-ink/80">
              <span>{t.game.histError}</span>
              <Button size="sm" variant="onHeroOutline" onClick={retryHist}>
                {t.common.actions.retry}
              </Button>
            </div>
          ) : (
            <LogHistogram histogram={hist} answer={reveal.answer} tone="onHero" />
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      {/* napkin math + next */}
      <div className="relative mt-auto flex flex-col gap-3 md:flex-row md:items-start">
        <details className="group min-w-0 flex-1 rounded-3xl bg-hero-ink/15">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-2 font-display text-lg font-semibold">
            <span className="inline-flex items-center gap-2">
              <Icon name="lightbulb" size={20} className="text-sand" />
              {t.game.napkin}
            </span>
            <Icon name="arrowDown" size={20} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 border-t border-hero-ink/25 px-5 py-4 leading-[1.8] [&_a]:text-sand">
            <Markdown>{reveal.explanation}</Markdown>
            {sourceUrl ? (
              <p className="text-sm text-hero-ink/80">
                {t.game.napkinSource}:{' '}
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sand">
                  {sourceLabel}
                  <Icon name="external" size={14} />
                </a>
                {reveal.as_of ? (
                  <>
                    {' · '}
                    {fmtNode(t.game.asOf, { d: <Num>{localizeDigits(reveal.as_of, digitStyle)}</Num> })}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </details>
        {showNext ? (
          <Button variant="onHero" size="lg" className="md:min-h-14 md:px-10 md:text-xl" onClick={onNext}>
            {nextLabel}
            <span aria-hidden="true">←</span>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
