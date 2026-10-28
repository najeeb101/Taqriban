'use client';
// ProfileScreen — /profile: stats tiles, personal score distribution, edit display name + university.
import { useState, type FormEvent, type ReactNode } from 'react';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { ScoreDistribution } from '@/components/game/ScoreDistribution';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ApiError, updateProfile } from '@/lib/api';
import { formatMultiple, localizeDigits } from '@/lib/format';
import { errorMessage, fmt, t } from '@/lib/i18n';
import { NAME_MAX, NAME_MIN, sanitizeName } from '@/lib/sanitize';
import { UNIVERSITIES } from '@/lib/universities';
import type { Profile } from '@/lib/types';
import { Field, describedBy, inputClasses } from './Field';

function Tile({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className="flex items-center gap-1.5 text-sm text-muted">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-bold">{children}</span>
    </div>
  );
}

function Stats({ profile }: { profile: Profile }) {
  const { digitStyle } = usePrefs();
  const days = (n: number) => localizeDigits(fmt(t.social.profilePage.days, { n }), digitStyle);
  const none = <span className="text-muted">–</span>;
  return (
    <section aria-labelledby="stats-title" className="flex flex-col gap-3">
      <h2 id="stats-title" className="text-xl">
        {t.social.profilePage.statsTitle}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Tile label={t.social.profilePage.games}>
          <Num>{localizeDigits(profile.games, digitStyle)}</Num>
        </Tile>
        <Tile label={t.social.profilePage.avg}>
          {profile.avg_score != null ? <Num>{formatMultiple(profile.avg_score, digitStyle)}</Num> : none}
        </Tile>
        <Tile label={t.social.profilePage.best}>
          {profile.best_score != null ? <Num>{formatMultiple(profile.best_score, digitStyle)}</Num> : none}
        </Tile>
        <Tile label={t.social.profilePage.streak} icon={<Icon name="flame" size={16} filled className="text-accent" />}>
          {days(profile.current_streak)}
        </Tile>
        <Tile label={t.social.profilePage.bestStreak} icon={<Icon name="trophy" size={16} />}>
          {days(profile.best_streak)}
        </Tile>
      </div>
      {profile.games === 0 ? <p className="text-muted">{t.social.profilePage.noStats}</p> : null}
    </section>
  );
}

function EditForm({ profile }: { profile: Profile }) {
  const { refreshProfile } = usePlayer();
  const { toast } = useToast();
  const [name, setName] = useState(profile.display_name);
  const [uni, setUni] = useState(profile.university ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clean = sanitizeName(name);
  const len = Array.from(clean).length;
  const lengthError =
    len < NAME_MIN ? t.social.profilePage.nameTooShort : len > NAME_MAX ? t.social.profilePage.nameTooLong : null;
  const shownError = error ?? (name !== profile.display_name ? lengthError : null);
  const dirty = clean !== profile.display_name || uni !== (profile.university ?? '');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lengthError) {
      setError(lengthError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateProfile({ display_name: clean, university: uni === '' ? null : uni });
      setName(saved.display_name);
      await refreshProfile();
      toast(t.social.profilePage.saved, { tone: 'success' });
    } catch (err) {
      setError(errorMessage((err as ApiError).code));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="edit-title">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 id="edit-title" className="text-xl">
          {t.social.profilePage.editTitle}
        </h2>
        <Field id="display-name" label={t.social.profilePage.nameLabel} hint={t.social.profilePage.nameHint} error={shownError}>
          <input
            id="display-name"
            className={inputClasses}
            value={name}
            autoComplete="nickname"
            aria-invalid={shownError ? true : undefined}
            aria-describedby={describedBy('display-name', t.social.profilePage.nameHint, shownError)}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>
        {clean !== name.trim() || clean ? (
          <p className="text-sm text-muted" aria-live="polite">
            {t.social.profilePage.namePreview} <strong className="text-ink">{clean}</strong>
          </p>
        ) : null}
        <Field id="university" label={t.social.profilePage.universityLabel} hint={t.social.profilePage.universityHint}>
          <select
            id="university"
            className={inputClasses}
            value={uni}
            aria-describedby={describedBy('university', t.social.profilePage.universityHint)}
            onChange={(e) => setUni(e.target.value)}
          >
            <option value="">{t.social.profilePage.universityNone}</option>
            {UNIVERSITIES.map((u) => (
              <option key={u.code} value={u.code}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" loading={saving} disabled={!dirty} fullWidth>
          {t.social.profilePage.save}
        </Button>
      </form>
    </Card>
  );
}

export function ProfileScreen() {
  const { status, profile, error, refreshProfile } = usePlayer();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">{t.social.profilePage.title}</h1>
      {status === 'loading' || (status === 'ready' && !profile) ? (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : status === 'error' || !profile ? (
        <ErrorState error={error} message={t.social.profilePage.loadError} onRetry={() => void refreshProfile()} />
      ) : (
        <>
          <Stats profile={profile} />
          {profile.distribution.length > 0 && profile.games > 0 ? (
            <section aria-labelledby="dist-title" className="flex flex-col gap-3">
              <h2 id="dist-title" className="text-xl">
                {t.social.profilePage.distTitle}
              </h2>
              <Card>
                <ScoreDistribution bins={profile.distribution} label={t.social.profilePage.distLabel} />
              </Card>
            </section>
          ) : null}
          <EditForm key={profile.id} profile={profile} />
        </>
      )}
    </div>
  );
}
