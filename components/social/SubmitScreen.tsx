'use client';
// SubmitScreen — /submit: question suggestion form with guidelines, validation and a success state.
import { useState, type FormEvent } from 'react';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { ApiError, submitQuestion } from '@/lib/api';
import { track } from '@/lib/analytics';
import { formatNumber } from '@/lib/format';
import { errorMessage, fmt, t } from '@/lib/i18n';
import { parseGuess } from '@/lib/parseGuess';
import type { SubmissionInput } from '@/lib/types';
import { Field, describedBy, inputClasses } from './Field';
import { isValidHttpUrl } from './utils';

const TEXT_MIN = 10;
const TEXT_MAX = 300;

interface Errors {
  text?: string;
  answer?: string;
  source?: string;
  form?: string;
}

export function SubmitScreen() {
  const { digitStyle } = usePrefs();
  const [text, setText] = useState('');
  const [unit, setUnit] = useState('');
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('');
  const [napkin, setNapkin] = useState('');
  const [credit, setCredit] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const parsed = answer.trim() ? parseGuess(answer) : null;

  function reset() {
    setText('');
    setUnit('');
    setAnswer('');
    setSource('');
    setNapkin('');
    setCredit('');
    setErrors({});
    setDone(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    const len = Array.from(text.trim()).length;
    if (len < TEXT_MIN || len > TEXT_MAX) next.text = t.social.submit.textInvalid;
    if (answer.trim() && parsed === null) next.answer = t.social.submit.answerInvalid;
    if (source.trim() && !isValidHttpUrl(source)) next.source = t.social.submit.sourceInvalid;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input: SubmissionInput = {
      text: text.trim(),
      unit: unit.trim() || undefined,
      proposed_answer: parsed,
      source_url: source.trim() || undefined,
      napkin: napkin.trim() || undefined,
      credit_name: credit.trim() || undefined,
    };
    setBusy(true);
    try {
      await submitQuestion(input);
      track('submit_question');
      setDone(true);
    } catch (err) {
      const code = (err as ApiError).code;
      setErrors({ form: code === 'rate_limited' ? t.social.submit.rateLimited : errorMessage(code) });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card padding="lg" className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-full bg-tier-green/15 text-tier-green">
          <Icon name="check" size={28} />
        </span>
        <h1 className="text-3xl">{t.social.submit.successTitle}</h1>
        <p className="text-muted">{t.social.submit.successBody}</p>
        <Button size="lg" fullWidth onClick={reset}>
          {t.social.submit.another}
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">{t.social.submit.title}</h1>
        <p className="text-muted">{t.social.submit.intro}</p>
      </header>

      <Card as="section" tone="accent" aria-labelledby="guide-title" className="flex flex-col gap-2">
        <h2 id="guide-title" className="flex items-center gap-2 text-lg">
          <Icon name="lightbulb" size={20} className="text-accent" />
          {t.social.submit.guidelinesTitle}
        </h2>
        <ul className="list-disc ps-5 text-sm marker:text-accent">
          {t.social.submit.guidelines.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </Card>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field id="q-text" label={t.social.submit.textLabel} hint={t.social.submit.textHint} error={errors.text}>
          <textarea
            id="q-text"
            rows={3}
            className={inputClasses}
            value={text}
            maxLength={TEXT_MAX + 50}
            placeholder={t.social.submit.textPlaceholder}
            aria-invalid={errors.text ? true : undefined}
            aria-describedby={describedBy('q-text', t.social.submit.textHint, errors.text)}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>

        <Field id="q-unit" label={t.social.submit.unitLabel}>
          <input
            id="q-unit"
            className={inputClasses}
            value={unit}
            maxLength={60}
            placeholder={t.social.submit.unitPlaceholder}
            onChange={(e) => setUnit(e.target.value)}
          />
        </Field>

        <Field id="q-answer" label={t.social.submit.answerLabel} hint={t.social.submit.answerHint} error={errors.answer}>
          <input
            id="q-answer"
            dir="ltr"
            inputMode="decimal"
            className={`${inputClasses} text-start`}
            value={answer}
            autoComplete="off"
            aria-invalid={errors.answer ? true : undefined}
            aria-describedby={describedBy('q-answer', t.social.submit.answerHint, errors.answer)}
            onChange={(e) => setAnswer(e.target.value)}
          />
          {parsed !== null ? (
            <p className="text-sm text-muted" aria-live="polite">
              {fmt(t.social.submit.answerPreview, { value: '' })}
              <Num className="font-bold text-ink">{formatNumber(parsed, digitStyle)}</Num>
            </p>
          ) : null}
        </Field>

        <Field id="q-source" label={t.social.submit.sourceLabel} hint={t.social.submit.sourceHint} error={errors.source}>
          <input
            id="q-source"
            type="url"
            dir="ltr"
            inputMode="url"
            className={`${inputClasses} text-start`}
            value={source}
            autoComplete="off"
            aria-invalid={errors.source ? true : undefined}
            aria-describedby={describedBy('q-source', t.social.submit.sourceHint, errors.source)}
            onChange={(e) => setSource(e.target.value)}
          />
        </Field>

        <Field id="q-napkin" label={t.social.submit.napkinLabel} hint={t.social.submit.napkinHint}>
          <textarea
            id="q-napkin"
            rows={4}
            className={inputClasses}
            value={napkin}
            maxLength={2000}
            aria-describedby={describedBy('q-napkin', t.social.submit.napkinHint)}
            onChange={(e) => setNapkin(e.target.value)}
          />
        </Field>

        <Field id="q-credit" label={t.social.submit.creditLabel} hint={t.social.submit.creditHint}>
          <input
            id="q-credit"
            className={inputClasses}
            value={credit}
            maxLength={40}
            autoComplete="off"
            aria-describedby={describedBy('q-credit', t.social.submit.creditHint)}
            onChange={(e) => setCredit(e.target.value)}
          />
        </Field>

        {errors.form ? (
          <p role="alert" className="rounded-xl border border-tier-red/40 bg-tier-red/10 p-3 text-tier-red">
            {errors.form}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={busy} fullWidth>
          {t.social.submit.submit}
        </Button>
      </form>
    </div>
  );
}
