'use client';
// FeedbackScreen — /feedback: tell us what to keep, fix or add. Kind (idea / bug / like / other), optional 1-5 rating,
// message and optional contact, with validation and a success state. Stored via submit_feedback (rate-limited per day).
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { ApiError, submitFeedback } from '@/lib/api';
import { track } from '@/lib/analytics';
import { formatNumber } from '@/lib/format';
import { errorMessage, fmt, t } from '@/lib/i18n';
import type { FeedbackKind } from '@/lib/types';
import { Field, describedBy, inputClasses } from './Field';

const MESSAGE_MIN = 5;
const MESSAGE_MAX = 2000;
const KINDS: FeedbackKind[] = ['idea', 'bug', 'like', 'other'];
// 1..5, from unhappy to delighted
const FACES = ['😞', '🙁', '😐', '🙂', '😍'];

export function FeedbackScreen() {
  const { digitStyle } = usePrefs();
  const F = t.social.feedback;
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState<{ message?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setKind('idea');
    setRating(null);
    setMessage('');
    setContact('');
    setErrors({});
    setDone(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const len = Array.from(message.trim()).length;
    if (len < MESSAGE_MIN || len > MESSAGE_MAX) {
      setErrors({ message: F.messageInvalid });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await submitFeedback({ kind, message: message.trim(), rating, contact: contact.trim() || undefined });
      track('submit_feedback', { kind });
      setDone(true);
    } catch (err) {
      const code = (err as ApiError).code;
      setErrors({ form: code === 'rate_limited' ? F.rateLimited : errorMessage(code) });
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
        <h1 className="text-3xl">{F.successTitle}</h1>
        <p className="text-muted">{F.successBody}</p>
        <Button size="lg" fullWidth onClick={reset}>
          {F.another}
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">{F.title}</h1>
        <p className="text-muted">{F.intro}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">{F.kindLabel}</legend>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <label
                key={k}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center justify-center rounded-full border px-4 text-center font-medium transition',
                  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                  kind === k ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface hover:border-ink/40',
                )}
              >
                <input
                  type="radio"
                  name="fb-kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                {F.kinds[k]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2" aria-describedby="fb-rating-hint">
          <legend className="mb-2 font-medium">{F.ratingLabel}</legend>
          <div className="flex justify-between gap-2">
            {FACES.map((face, i) => {
              const n = i + 1;
              const on = rating === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  aria-label={fmt(F.ratingValue, { n: formatNumber(n, digitStyle) })}
                  onClick={() => setRating(on ? null : n)}
                  className={cn(
                    'grid aspect-square flex-1 place-items-center rounded-2xl border text-3xl transition active:scale-95 sm:text-4xl',
                    on ? 'scale-105 border-accent bg-accent/10' : 'border-line bg-surface grayscale-[0.6] hover:grayscale-0',
                  )}
                >
                  <span aria-hidden="true">{face}</span>
                </button>
              );
            })}
          </div>
          <p id="fb-rating-hint" className="text-sm text-muted">
            {F.ratingHint}
          </p>
        </fieldset>

        <Field id="fb-message" label={F.messageLabel} hint={F.messageHint} error={errors.message}>
          <textarea
            id="fb-message"
            rows={5}
            className={inputClasses}
            value={message}
            maxLength={MESSAGE_MAX + 50}
            placeholder={F.placeholders[kind]}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy('fb-message', F.messageHint, errors.message)}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>

        <Field id="fb-contact" label={F.contactLabel} hint={F.contactHint}>
          <input
            id="fb-contact"
            dir="ltr"
            className={`${inputClasses} text-start`}
            value={contact}
            maxLength={120}
            autoComplete="email"
            aria-describedby={describedBy('fb-contact', F.contactHint)}
            onChange={(e) => setContact(e.target.value)}
          />
        </Field>

        {errors.form ? (
          <p role="alert" className="rounded-xl border border-tier-red/40 bg-tier-red/10 p-3 text-tier-red">
            {errors.form}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={busy} fullWidth>
          {F.submit}
        </Button>
      </form>
    </div>
  );
}
