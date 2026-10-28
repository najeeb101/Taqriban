'use client';
// GuessInput — LTR numeric text field with unit label, live «سيتم تسجيل: 5,000,000» preview and validation message.
// Props: value, onChange(text), onSubmit() (Enter), unit, labelledBy (id of the element holding the question text),
//   disabled?, inputRef?, className?. The caller parses with parseGuess(value) to get the number.
import { useId, type Ref } from 'react';
import { Num } from '@/components/ui/Num';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber, localizeDigits } from '@/lib/format';
import { t } from '@/lib/i18n';
import { parseGuess } from '@/lib/parseGuess';

export function GuessInput({
  value,
  onChange,
  onSubmit,
  unit,
  labelledBy,
  disabled = false,
  inputRef,
  className,
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  unit: string;
  labelledBy: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const { digitStyle } = usePrefs();
  const id = useId();
  const parsed = value.trim() === '' ? null : parseGuess(value);
  const invalid = value.trim() !== '' && parsed === null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-surface px-4 transition-colors',
          'focus-within:border-accent',
          invalid ? 'border-tier-red' : 'border-line',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          dir="ltr"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-labelledby={labelledBy}
          aria-describedby={`${id}-help`}
          aria-invalid={invalid}
          placeholder={t.game.guessPlaceholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="num min-w-0 flex-1 bg-transparent py-3 text-end text-2xl font-medium text-ink outline-none placeholder:text-base placeholder:font-normal placeholder:text-muted"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        {unit ? (
          <span className="max-w-[40%] shrink-0 text-muted" title={unit}>
            {unit}
          </span>
        ) : null}
      </div>
      <p id={`${id}-help`} className="min-h-7 text-sm" aria-live="polite">
        {parsed !== null ? (
          <span className="text-muted">
            {t.game.previewLabel} <Num className="font-medium text-ink">{formatNumber(parsed, digitStyle)}</Num>
          </span>
        ) : invalid ? (
          <span className="text-tier-red">{t.game.invalidGuess}</span>
        ) : (
          <span className="text-muted">{localizeDigits(t.game.guessHint, digitStyle)}</span>
        )}
      </p>
    </div>
  );
}
