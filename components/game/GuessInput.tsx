'use client';
// GuessInput — LTR numeric text field with unit label, live «سيتم تسجيل: 5,000,000» preview and validation message.
// Props: value, onChange(text), onSubmit() (Enter), unit, labelledBy (id of the element holding the question text),
//   disabled?, inputRef?, className?. The caller parses with parseGuess(value) to get the number.
import { useId, type Ref } from 'react';
import { Num } from '@/components/ui/Num';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber } from '@/lib/format';
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
  tone = 'default',
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  unit: string;
  labelledBy: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  /** 'onHero' = translucent field with sand accents, for the flat maroon question card. */
  tone?: 'default' | 'onHero';
}) {
  const { digitStyle } = usePrefs();
  const id = useId();
  const hero = tone === 'onHero';
  const parsed = value.trim() === '' ? null : parseGuess(value);
  const invalid = value.trim() !== '' && parsed === null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-3 border-2 px-4 transition-colors',
          hero
            ? 'min-h-[4.5rem] rounded-3xl bg-hero-ink/15 px-5 focus-within:border-sand md:min-h-[clamp(3.5rem,9dvh,6rem)]'
            : 'min-h-16 rounded-2xl bg-surface focus-within:border-accent',
          invalid ? (hero ? 'border-sand' : 'border-tier-red') : hero ? 'border-transparent' : 'border-line',
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
          className={cn(
            'num min-w-0 flex-1 bg-transparent py-3 text-end font-medium outline-none placeholder:text-base placeholder:font-normal',
            hero
              ? 'font-display text-3xl text-hero-ink placeholder:text-hero-ink/60 md:text-[clamp(1.5rem,4.6dvh,2.25rem)]'
              : 'text-2xl text-ink placeholder:text-muted',
          )}
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        {unit ? (
          <span
            className={cn('max-w-[40%] shrink-0', hero ? 'font-display text-lg font-semibold text-sand md:text-xl' : 'text-muted')}
            title={unit}
          >
            {unit}
          </span>
        ) : null}
      </div>
      <p id={`${id}-help`} className="min-h-7 text-sm" aria-live="polite">
        {parsed !== null ? (
          <span className={hero ? 'text-hero-ink/80' : 'text-muted'}>
            {t.game.previewLabel}{' '}
            <Num className={cn('font-medium', hero ? 'text-sand' : 'text-ink')}>{formatNumber(parsed, digitStyle)}</Num>
          </span>
        ) : invalid ? (
          <span className={hero ? 'text-sand' : 'text-tier-red'}>{t.game.invalidGuess}</span>
        ) : null}
      </p>
    </div>
  );
}
