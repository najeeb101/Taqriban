'use client';
// GroupsScreen — /groups: my groups, create-group form, join-by-code form.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ApiError, createGroup, getMyGroups, joinGroup } from '@/lib/api';
import { localizeDigits } from '@/lib/format';
import { errorMessage, fmt, t } from '@/lib/i18n';
import type { GroupKind } from '@/lib/types';
import { Field, describedBy, inputClasses } from './Field';
import { useAsync } from './useAsync';
import { codeFromInput, groupNameLength, isValidGroupName, isValidJoinCode, GROUP_NAME_MAX } from './utils';

const KINDS: GroupKind[] = ['friends', 'class', 'club', 'university'];

export function GroupsScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { digitStyle } = usePrefs();
  const groups = useAsync('my-groups', getMyGroups);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<GroupKind>('friends');
  const [nameError, setNameError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!isValidGroupName(name)) {
      setNameError(t.social.groups.nameInvalid);
      return;
    }
    setNameError(null);
    setCreating(true);
    try {
      const g = await createGroup(name.trim().replace(/\s+/g, ' '), kind);
      toast(t.social.groups.created, { tone: 'success' });
      router.push(`/groups/${g.join_code}`);
    } catch (err) {
      setNameError(errorMessage((err as ApiError).code));
      setCreating(false);
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    const normalized = codeFromInput(code);
    if (!isValidJoinCode(normalized)) {
      setCodeError(t.social.groups.codeInvalid);
      return;
    }
    setCodeError(null);
    setJoining(true);
    try {
      const g = await joinGroup(normalized);
      toast(t.social.groups.joined, { tone: 'success' });
      router.push(`/groups/${g.join_code}`);
    } catch (err) {
      setCodeError(errorMessage((err as ApiError).code));
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">{t.social.groups.title}</h1>
        <p className="text-muted">{t.social.groups.intro}</p>
      </header>

      <section aria-label={t.social.groups.title} className="flex flex-col gap-3">
        {groups.loading ? (
          <div className="flex justify-center py-8">
            <Spinner size={32} />
          </div>
        ) : groups.error || !groups.data ? (
          <ErrorState error={groups.error} message={t.social.groups.loadError} onRetry={groups.reload} />
        ) : groups.data.length === 0 ? (
          <EmptyState icon="users" title={t.social.groups.emptyTitle} description={t.social.groups.emptyBody} />
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.data.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.join_code}`}
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-4 no-underline shadow-card transition hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <Icon name="users" size={22} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-lg font-medium text-ink">{g.name}</span>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      <Chip>{t.social.groupKinds[g.kind]}</Chip>
                      <span>
                        {g.members === 1
                          ? t.social.groups.memberOne
                          : localizeDigits(fmt(t.social.groups.members, { n: g.members }), digitStyle)}
                      </span>
                      {g.is_owner ? <Chip tone="accent">{t.social.groups.owner}</Chip> : null}
                    </span>
                  </span>
                  <Icon name="chevron" size={20} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card as="section" aria-labelledby="create-title">
        <form onSubmit={onCreate} className="flex flex-col gap-4" noValidate>
          <h2 id="create-title" className="text-xl">
            {t.social.groups.createTitle}
          </h2>
          <Field id="group-name" label={t.social.groups.nameLabel} hint={t.social.groups.nameHint} error={nameError}>
            <input
              id="group-name"
              className={inputClasses}
              value={name}
              maxLength={GROUP_NAME_MAX + 10}
              placeholder={t.social.groups.namePlaceholder}
              autoComplete="off"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={describedBy('group-name', t.social.groups.nameHint, nameError)}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
            />
            <span className="sr-only" aria-live="polite">
              {groupNameLength(name)}/{GROUP_NAME_MAX}
            </span>
          </Field>
          <Field id="group-kind" label={t.social.groups.kindLabel}>
            <select
              id="group-kind"
              className={inputClasses}
              value={kind}
              onChange={(e) => setKind(e.target.value as GroupKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t.social.groupKinds[k]}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" loading={creating} fullWidth icon={<Icon name="plus" />}>
            {t.social.groups.createButton}
          </Button>
        </form>
      </Card>

      <Card as="section" aria-labelledby="join-title">
        <form onSubmit={onJoin} className="flex flex-col gap-4" noValidate>
          <h2 id="join-title" className="text-xl">
            {t.social.groups.joinTitle}
          </h2>
          <Field id="join-code" label={t.social.groups.codeLabel} hint={t.social.groups.codeHint} error={codeError}>
            <input
              id="join-code"
              dir="ltr"
              className={`${inputClasses} text-center font-mono text-xl uppercase tracking-widest`}
              value={code}
              placeholder={t.social.groups.codePlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={describedBy('join-code', t.social.groups.codeHint, codeError)}
              onChange={(e) => {
                setCode(e.target.value.includes('/') ? e.target.value : e.target.value.replace(/\s+/g, '').toUpperCase());
                if (codeError) setCodeError(null);
              }}
            />
          </Field>
          <Button type="submit" variant="secondary" loading={joining} fullWidth>
            {t.social.groups.joinButton}
          </Button>
        </form>
      </Card>
    </div>
  );
}
