'use client';
// SettingsScreen — /settings: digits, theme, reduce motion, privacy, delete my data. (Account lives on /profile.)
import { useState, type ReactNode } from 'react';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { ApiError, deleteMyData } from '@/lib/api';
import { formatNumber, localizeDigits } from '@/lib/format';
import { errorMessage, fmt, t } from '@/lib/i18n';
import type { DigitStyle, ThemePref } from '@/lib/types';
import { ConfirmSheet } from './ConfirmSheet';
import { Field, inputClasses } from './Field';

function Choice<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: ReactNode }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-12 flex-1 rounded-xl border px-3 text-base font-medium transition',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              on ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-ink hover:border-ink/40',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsScreen() {
  const { digitStyle, setDigitStyle, theme, setTheme, reduceMotion, setReduceMotion } = usePrefs();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    try {
      await deleteMyData();
      window.location.replace('/');
    } catch (err) {
      toast(errorMessage((err as ApiError).code), { tone: 'error' });
      setBusy(false);
    }
  }

  const preview = (style: DigitStyle) => formatNumber(1234567, style);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">{t.social.settingsPage.title}</h1>

      <section aria-labelledby="display-title" className="flex flex-col gap-5">
        <h2 id="display-title" className="text-xl">
          {t.social.settingsPage.display}
        </h2>

        <div className="flex flex-col gap-2">
          <span className="font-medium" id="digits-label">
            {t.common.digits.label}
          </span>
          <Choice<DigitStyle>
            label={t.common.digits.label}
            value={digitStyle}
            onChange={setDigitStyle}
            options={[
              { value: 'latn', label: <Num>{preview('latn')}</Num> },
              { value: 'arab', label: <Num>{preview('arab')}</Num> },
            ]}
          />
          <p className="text-sm text-muted">
            {t.social.settingsPage.digitsPreview} <Num>{localizeDigits('2026 / 10 / 28', digitStyle)}</Num>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium">{t.common.theme.label}</span>
          <Choice<ThemePref>
            label={t.common.theme.label}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'auto', label: t.common.theme.auto },
              { value: 'light', label: t.common.theme.light },
              { value: 'dark', label: t.common.theme.dark },
            ]}
          />
        </div>

        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-2">
          <span className="flex flex-col">
            <span className="font-medium">{t.common.motion.reduce}</span>
            <span className="text-sm text-muted">{t.social.settingsPage.reduceMotionHelp}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            className="size-6 shrink-0 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
      </section>

      <section aria-labelledby="privacy-title" className="flex flex-col gap-2">
        <h2 id="privacy-title" className="text-xl">
          {t.social.settingsPage.privacyTitle}
        </h2>
        <p className="text-muted">{t.social.settingsPage.privacyBody}</p>
      </section>

      <section aria-labelledby="danger-title" className="flex flex-col gap-3 rounded-2xl border border-tier-red/40 p-5">
        <h2 id="danger-title" className="text-xl text-tier-red">
          {t.social.settingsPage.dangerTitle}
        </h2>
        <p className="text-muted">{t.social.settingsPage.dangerBody}</p>
        <Button
          variant="secondary"
          fullWidth
          className="!border-tier-red/50 !text-tier-red"
          onClick={() => {
            setTyped('');
            setDeleteOpen(true);
          }}
        >
          {t.social.settingsPage.deleteButton}
        </Button>
      </section>

      <ConfirmSheet
        open={deleteOpen}
        onClose={() => !busy && setDeleteOpen(false)}
        title={t.social.settingsPage.deleteSheetTitle}
        body={<p>{fmt(t.social.settingsPage.deleteSheetBody, { word: t.social.settingsPage.deleteWord })}</p>}
        confirmLabel={t.social.settingsPage.deleteConfirm}
        loading={busy}
        confirmDisabled={typed.trim() !== t.social.settingsPage.deleteWord}
        onConfirm={doDelete}
      >
        <Field id="delete-word" label={t.social.settingsPage.deleteFieldLabel}>
          <input
            id="delete-word"
            className={inputClasses}
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        </Field>
      </ConfirmSheet>
    </div>
  );
}
