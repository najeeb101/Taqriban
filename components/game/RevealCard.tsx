'use client';
// RevealCard — the REVEAL stage for one question.
// Props: reveal (Reveal), question (QuestionPublic), nextLabel (button text), onNext(), headingRef?, animate? (pop the chip),
//   showNext? (default true). Fetches the histogram itself (getHistogram) with a retry on failure.
// Shows «خمّنت X» → «الإجابة Y unit», a tier-coloured result chip with arrow, percentile / not-enough note, the log
// histogram, collapsible napkin math (Markdown) and the source link. A polite live region announces the result.
import { useCallback, useEffect, useState, type Ref } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Markdown } from '@/components/ui/Markdown';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { getHistogram } from '@/lib/api';
import { formatNumber, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { tier } from '@/lib/scoring';
import type { Histogram, QuestionPublic, Reveal, Tier } from '@/lib/types';
import { LogHistogram } from './LogHistogram';
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
}: {
  reveal: Reveal;
  question: QuestionPublic;
  nextLabel: string;
  onNext: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  animate?: boolean;
  showNext?: boolean;
}) {
  const { digitStyle } = usePrefs();
  const [hist, setHist] = useState<Histogram | null>(null);
  const [histState, setHistState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [announce, setAnnounce] = useState('');
  const qid = reveal.question_id;

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

  return (
    <Card as="section" padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl leading-[1.6] outline-none">
          {localizeDigits(question.text, digitStyle)}
        </h2>
      </div>

      {/* guess -> answer ledger */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-bg/50 p-3">
          <p className="text-sm text-muted">{t.game.yourGuess}</p>
          <p className="mt-1 text-2xl font-medium">
            <Num>{formatNumber(reveal.guess, digitStyle)}</Num>
          </p>
        </div>
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
          <p className="text-sm text-muted">{t.game.guessedAnswerLine}</p>
          <p className="mt-1 text-2xl font-medium text-accent">
            <Num>{formatNumber(reveal.answer, digitStyle)}</Num>
          </p>
          {question.unit ? <p className="text-sm text-muted">{question.unit}</p> : null}
        </div>
      </div>

      {/* result chip */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Chip
          tone={TIER_TONE[tr]}
          icon={<Icon name={exact ? 'target' : reveal.direction === 'low' ? 'arrowDown' : 'arrowUp'} size={18} />}
          className={`px-4 py-2 text-base ${animate ? 'animate-pop' : ''}`}
        >
          {exact
            ? t.game.exact
            : fmtNode(reveal.direction === 'low' ? t.game.tooLow : t.game.tooHigh, { x: <Num>{x}×</Num> })}
        </Chip>
        <p className="text-muted">
          {reveal.closer_than_pct !== null
            ? fmtNode(t.game.closerThan, { p: <Num>{localizeDigits(reveal.closer_than_pct, digitStyle)}%</Num> })
            : t.game.notEnough}
        </p>
        <p className="text-sm text-muted">
          {fmtNode(t.game.playersAnswered, { n: <Num>{formatNumber(reveal.players, digitStyle)}</Num> })}
        </p>
      </div>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      {/* histogram */}
      <div className="min-h-40">
        {histState === 'loading' ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted">
            <Spinner size={18} label={t.game.histLoading} />
            <span aria-hidden="true">{t.game.histLoading}</span>
          </div>
        ) : histState === 'error' || !hist ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted">
            <span>{t.game.histError}</span>
            <Button size="sm" variant="secondary" onClick={retryHist}>
              {t.common.actions.retry}
            </Button>
          </div>
        ) : (
          <LogHistogram histogram={hist} answer={reveal.answer} />
        )}
      </div>

      {/* napkin math + source */}
      <details className="group rounded-xl border border-line bg-bg/40">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-medium">
          <span className="inline-flex items-center gap-2">
            <Icon name="lightbulb" size={18} className="text-accent" />
            {t.game.napkin}
          </span>
          <Icon name="arrowDown" size={18} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 leading-[1.8]">
          <Markdown>{reveal.explanation}</Markdown>
        </div>
      </details>

      {sourceUrl ? (
        <p className="text-sm text-muted">
          {t.game.napkinSource}:{' '}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
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

      {showNext ? (
        <Button size="lg" fullWidth onClick={onNext}>
          {nextLabel}
        </Button>
      ) : null}
    </Card>
  );
}
