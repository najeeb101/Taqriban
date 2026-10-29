'use client';
// QuestionCard — the INPUT stage as a flat maroon card: tabs row (س١ س٢ س٣ with category icons), category label, big question
// text, translucent GuessInput, round calculator button and the «ثبّت إجابتك» pill (outlined until the guess is valid, then solid).
// Props: question (QuestionPublic), index (0-based), total, onLock(guess: number) -> Promise<void>, submitting, tabs? (node for the
//   top row), headingRef?, autoFocus? (focus the input on mount; false for the very first paint so mobile keyboards don't pop).
// The calculator's «استخدم النتيجة» fills the field. Double taps are ignored while submitting.
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber, localizeDigits } from '@/lib/format';
import { categoryLabel, t } from '@/lib/i18n';
import { parseGuess } from '@/lib/parseGuess';
import type { QuestionPublic } from '@/lib/types';
import { fmtNode } from './richText';
import { Calculator } from './Calculator';
import { CategoryIcon } from './CategoryIcon';
import { GuessInput } from './GuessInput';
import { numberToInput } from './chartMath';

export function QuestionCard({
  question,
  index,
  total,
  submitting,
  tabs,
  onLock,
  headingRef,
  autoFocus = true,
}: {
  question: QuestionPublic;
  index: number;
  total: number;
  submitting: boolean;
  tabs?: ReactNode;
  onLock: (guess: number) => void | Promise<void>;
  headingRef?: Ref<HTMLHeadingElement>;
  autoFocus?: boolean;
}) {
  const { digitStyle } = usePrefs();
  const [text, setText] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const parsed = parseGuess(text);

  function lock() {
    if (submitting) return;
    if (parsed === null) {
      setShowInvalid(true);
      inputRef.current?.focus();
      return;
    }
    navigator.vibrate?.(12);
    void onLock(parsed);
  }

  // The card is as tall as its content; short questions get bigger type, long ones smaller, so it always fits the
  // screen. Desktop sizes also scale with the viewport height (dvh).
  const len = question.text.length;
  const qSize =
    len <= 45
      ? 'text-[clamp(1.9rem,10.5vw,2.5rem)] md:text-[clamp(2.25rem,8dvh,4.25rem)]'
      : len <= 70
        ? 'text-[clamp(1.7rem,9vw,2.15rem)] md:text-[clamp(2.1rem,7.6dvh,4rem)]'
        : len <= 95
          ? 'text-[clamp(1.5rem,8vw,1.9rem)] md:text-[clamp(1.75rem,5.8dvh,3rem)]'
          : 'text-[clamp(1.4rem,7.2vw,1.7rem)] md:text-[clamp(1.8rem,6dvh,3rem)]';

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-hero p-5 text-hero-ink min-[360px]:p-6 shadow-card md:gap-[clamp(0.75rem,2.6dvh,2rem)] md:rounded-[2.5rem] md:p-[clamp(1.25rem,4.5dvh,2.5rem)]"
    >
      {/* big faint category icon as a watermark */}
      <CategoryIcon
        category={question.category}
        size={260}
        className="pointer-events-none absolute -bottom-10 -start-10 -rotate-12 text-hero-ink opacity-[0.07]"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {tabs}
        <p className="sr-only">
          {fmtNode(t.game.questionOf, {
            i: <Num>{formatNumber(index + 1, digitStyle)}</Num>,
            n: <Num>{formatNumber(total, digitStyle)}</Num>,
          })}
        </p>
        {question.category ? (
          <p className="font-script text-lg text-sand md:text-xl">{categoryLabel(question.category)}</p>
        ) : null}
      </div>

      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className={`relative font-display leading-[1.3] font-bold text-balance outline-none ${qSize}`}
      >
        {localizeDigits(question.text, digitStyle)}
      </h2>

      <div className="relative flex flex-col gap-1">
        <GuessInput
          tone="onHero"
          value={text}
          onChange={(v) => {
            setText(v);
            setShowInvalid(false);
          }}
          onSubmit={lock}
          unit={question.unit}
          labelledBy={headingId}
          disabled={submitting}
          inputRef={inputRef}
        />
        {showInvalid && parsed === null && text.trim() === '' ? (
          <p role="alert" className="text-sm text-sand">
            {t.game.invalidGuess}
          </p>
        ) : null}
      </div>

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          aria-label={t.game.openCalculator}
          title={t.game.openCalculator}
          disabled={submitting}
          onClick={() => setCalcOpen(true)}
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-hero-ink/50 text-hero-ink transition hover:border-hero-ink hover:bg-hero-ink/10 active:scale-95 disabled:opacity-50 md:size-[clamp(3rem,7.5dvh,4rem)]"
        >
          <Icon name="calc" size={26} />
        </button>
        <Button
          variant={parsed !== null ? 'onHero' : 'onHeroOutline'}
          size="lg"
          className="flex-1 text-xl md:min-h-[clamp(3rem,7.5dvh,4rem)] md:text-[clamp(1.25rem,3dvh,1.5rem)]"
          loading={submitting}
          disabled={submitting}
          onClick={lock}
        >
          {t.game.lockIn}
        </Button>
      </div>

      <Calculator
        open={calcOpen}
        onClose={() => {
          setCalcOpen(false);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        onUse={(v) => {
          setText(numberToInput(v));
          setShowInvalid(false);
        }}
      />
    </section>
  );
}
