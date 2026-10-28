'use client';
// QuestionCard — the INPUT stage: «السؤال i / n», category chip, question text, GuessInput, calculator, «ثبّت إجابتك».
// Props: question (QuestionPublic), index (0-based), total, onLock(guess: number) -> Promise<void>, submitting,
//   headingRef?, autoFocus? (focus the input on mount; false for the very first paint so mobile keyboards don't pop).
// The calculator's «استخدم النتيجة» fills the field. Double taps are ignored while submitting.
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber, localizeDigits } from '@/lib/format';
import { categoryLabel, t } from '@/lib/i18n';
import { parseGuess } from '@/lib/parseGuess';
import type { QuestionPublic } from '@/lib/types';
import { fmtNode } from './richText';
import { Calculator } from './Calculator';
import { GuessInput } from './GuessInput';
import { numberToInput } from './chartMath';

export function QuestionCard({
  question,
  index,
  total,
  submitting,
  onLock,
  headingRef,
  autoFocus = true,
}: {
  question: QuestionPublic;
  index: number;
  total: number;
  submitting: boolean;
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
    void onLock(parsed);
  }

  return (
    <Card as="section" padding="lg" className="flex flex-col gap-5" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">
          {fmtNode(t.game.questionOf, {
            i: <Num>{formatNumber(index + 1, digitStyle)}</Num>,
            n: <Num>{formatNumber(total, digitStyle)}</Num>,
          })}
        </p>
        {question.category ? <Chip tone="accent">{categoryLabel(question.category)}</Chip> : null}
      </div>

      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-[1.65rem] leading-[1.55] outline-none"
      >
        {localizeDigits(question.text, digitStyle)}
      </h2>

      <GuessInput
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
        <p role="alert" className="-mt-3 text-sm text-tier-red">
          {t.game.invalidGuess}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth loading={submitting} disabled={submitting} onClick={lock}>
          {t.game.lockIn}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          icon={<Icon name="calc" />}
          disabled={submitting}
          onClick={() => setCalcOpen(true)}
        >
          {t.game.openCalculator}
        </Button>
        <p className="text-center text-sm text-muted">{t.game.oneGuess}</p>
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
    </Card>
  );
}
