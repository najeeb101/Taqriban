'use client';
// AdminScreen — /admin, the private dashboard. Non-admins (server answers `forbidden`) see a locked state that points
// to Settings. Tabs: overview (KPI tiles, 14-day activity, universities, recent puzzles), feedback inbox, question
// submissions, question calibration. Every number comes from the admin_* RPCs (supabase/migrations/…_admin.sql).
import { useCallback, useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/components/ui/cn';
import { ADMIN_BREAKOUT } from '@/components/ui/layout';
import { usePrefs } from '@/components/providers/PrefsProvider';
import {
  ApiError,
  adminDashboard,
  adminListFeedback,
  adminListSubmissions,
  adminSetFeedbackStatus,
  adminSetSubmissionStatus,
} from '@/lib/api';
import { formatMultiple, formatNumber, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { UNIVERSITIES } from '@/lib/universities';
import type {
  AdminDashboard,
  AdminSubmission,
  DigitStyle,
  FeedbackStatus,
  SubmissionStatus,
} from '@/lib/types';

const A = t.admin;
type Tab = 'overview' | 'feedback' | 'submissions' | 'questions';
const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'read', 'done'];
const SUBMISSION_STATUSES: SubmissionStatus[] = ['new', 'reviewing', 'accepted', 'rejected', 'scheduled'];
const FACES = ['😞', '🙁', '😐', '🙂', '😍'];

function universityName(code: string | null): string {
  if (!code) return A.noUniversity;
  return UNIVERSITIES.find((u) => u.code === code)?.name ?? code;
}

function dateTime(iso: string, digits: DigitStyle): string {
  return new Intl.DateTimeFormat(digits === 'arab' ? 'ar-EG-u-nu-arab' : 'ar-u-nu-latn', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Qatar',
  }).format(new Date(iso));
}

/** "29/10" for a YYYY-MM-DD day. */
function shortDay(ymd: string, digits: DigitStyle): string {
  const [, m, d] = ymd.split('-');
  return localizeDigits(`${Number(d)}/${Number(m)}`, digits);
}

export function AdminScreen() {
  const { digitStyle } = usePrefs();
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'locked' | 'error'; error?: unknown }>({
    status: 'loading',
  });
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    adminDashboard()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoadedAt(new Date());
        setState({ status: 'ok' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState((e as ApiError).code === 'forbidden' ? { status: 'locked' } : { status: 'error', error: e });
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  if (state.status === 'loading' && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted">
        <Spinner size={30} />
        <p>{A.loading}</p>
      </div>
    );
  }
  if (state.status === 'locked') {
    return (
      <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon name="user" size={28} />
        </span>
        <h1 className="text-2xl">{A.lockedTitle}</h1>
        <p className="text-muted">{A.lockedBody}</p>
        <ButtonLink href="/settings" variant="secondary">
          {A.lockedCta}
        </ButtonLink>
      </Card>
    );
  }
  if (state.status === 'error' || !data) {
    return <ErrorState error={state.error} onRetry={refresh} className="py-12" />;
  }

  const k = data.kpis;
  const tabItems: { value: Tab; label: React.ReactNode }[] = [
    { value: 'overview', label: A.tabs.overview },
    { value: 'feedback', label: <CountLabel text={A.tabs.feedback} n={k.feedback_new} digits={digitStyle} /> },
    { value: 'submissions', label: <CountLabel text={A.tabs.submissions} n={k.submissions_new} digits={digitStyle} /> },
    { value: 'questions', label: A.tabs.questions },
  ];

  return (
    <div className={cn('flex flex-col gap-6', ADMIN_BREAKOUT)}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">{A.title}</h1>
          <p className="text-muted">{A.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {loadedAt ? (
            <span className="text-sm text-muted">
              {fmt(A.updatedAt, {
                t: new Intl.DateTimeFormat(digitStyle === 'arab' ? 'ar-EG-u-nu-arab' : 'ar-u-nu-latn', {
                  timeStyle: 'short',
                }).format(loadedAt),
              })}
            </span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={refresh} loading={state.status === 'loading'}>
            {A.refresh}
          </Button>
        </div>
      </header>

      <Tabs items={tabItems} value={tab} onChange={setTab} ariaLabel={A.title} idPrefix="admin" />

      <div role="tabpanel" aria-labelledby={`admin-tab-${tab}`} className="flex flex-col gap-6">
        {tab === 'overview' ? <Overview data={data} digits={digitStyle} /> : null}
        {tab === 'feedback' ? <FeedbackInbox digits={digitStyle} onChanged={refresh} /> : null}
        {tab === 'submissions' ? <SubmissionsInbox digits={digitStyle} onChanged={refresh} /> : null}
        {tab === 'questions' ? <Questions data={data} digits={digitStyle} /> : null}
      </div>
    </div>
  );
}

function CountLabel({ text, n, digits }: { text: string; n: number; digits: DigitStyle }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      {n > 0 ? (
        <span className="rounded-full bg-accent px-1.5 text-xs leading-5 font-bold text-accent-ink">
          <Num>{formatNumber(n, digits)}</Num>
        </span>
      ) : null}
    </span>
  );
}

// ------------------------------------------------------------------ overview

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card padding="md" className="flex min-w-0 flex-col gap-1">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

function Overview({ data, digits }: { data: AdminDashboard; digits: DigitStyle }) {
  const k = data.kpis;
  const n = (v: number) => <Num>{formatNumber(v, digits)}</Num>;
  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={A.tabs.overview}>
        <Tile label={A.kpi.active_today} value={n(k.active_today)} />
        <Tile label={A.kpi.completions_today} value={n(k.completions_today)} />
        <Tile label={A.kpi.active_7d} value={n(k.active_7d)} />
        <Tile
          label={A.kpi.returning_7d}
          value={n(k.returning_7d)}
          hint={fmt(A.returningHint, { n: formatNumber(k.active_7d, digits) })}
        />
        <Tile
          label={A.kpi.players_played}
          value={n(k.players_played)}
          hint={fmt(A.playedHint, { n: formatNumber(k.players_total, digits) })}
        />
        <Tile label={A.kpi.players_total} value={n(k.players_total)} hint={A.visitorsHint} />
        <Tile label={A.kpi.players_new_7d} value={n(k.players_new_7d)} />
        <Tile label={A.kpi.players_with_email} value={n(k.players_with_email)} />
        <Tile
          label={A.kpi.avg_score_7d}
          value={k.avg_score_7d !== null ? <Num>{formatMultiple(k.avg_score_7d, digits)}</Num> : '–'}
        />
        <Tile label={A.kpi.feedback_new} value={n(k.feedback_new)} />
        <Tile
          label={A.kpi.feedback_avg_rating}
          value={
            k.feedback_avg_rating !== null ? (
              <Num>{localizeDigits(k.feedback_avg_rating.toFixed(1), digits)} / 5</Num>
            ) : (
              '–'
            )
          }
        />
        <Tile label={A.kpi.submissions_new} value={n(k.submissions_new)} />      </section>

      <ActivityChart activity={data.activity} digits={digits} />

      <div className="grid gap-6 md:grid-cols-2">
        <Universities rows={data.universities} digits={digits} />
        <Card as="section" padding="md" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg">{A.puzzlesTitle}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line text-start">
                  <th className="py-2 text-start font-medium">{A.colPuzzle}</th>
                  <th className="py-2 text-start font-medium">{A.colDate}</th>
                  <th className="py-2 text-end font-medium">{A.colPlayers}</th>
                  <th className="py-2 text-end font-medium">{A.colCompleted}</th>
                  <th className="py-2 text-end font-medium">{A.colDaily}</th>
                  <th className="py-2 text-end font-medium">{A.colAvgScore}</th>
                </tr>
              </thead>
              <tbody className="num">
                {data.puzzles.map((p) => (
                  <tr key={p.number} className="border-b border-line/60 last:border-0">
                    <td className="py-2">{n(p.number)}</td>
                    <td className="py-2 text-muted">{shortDay(p.publish_date, digits)}</td>
                    <td className="py-2 text-end">{n(p.players)}</td>
                    <td className="py-2 text-end">{n(p.completions)}</td>
                    <td className="py-2 text-end">{n(p.daily_completions)}</td>
                    <td className="py-2 text-end">
                      {p.avg_score !== null ? <Num>{formatMultiple(p.avg_score, digits)}</Num> : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

/** Single-series column chart of active players per day (Qatar days, oldest -> newest, left -> right). */
function ActivityChart({ activity, digits }: { activity: AdminDashboard['activity']; digits: DigitStyle }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...activity.map((d) => d.active_players));
  const shown = hover ?? activity.length - 1;
  const d = activity[shown];
  const tip = d
    ? fmt(A.activityTip, {
        day: shortDay(d.day, digits),
        active: formatNumber(d.active_players, digits),
        new: formatNumber(d.new_players, digits),
        done: formatNumber(d.completions, digits),
      })
    : '';

  return (
    <Card as="section" padding="md" className="flex flex-col gap-3" aria-labelledby="activity-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-title" className="text-lg">
          {A.activityTitle}
        </h2>
        <p className="text-sm text-muted">{A.activityCaption}</p>
      </div>
      <p className="min-h-6 text-sm font-medium" aria-live="polite">
        {tip}
      </p>
      <div dir="ltr" className="flex h-44 items-end gap-0.5" onMouseLeave={() => setHover(null)}>
        {activity.map((day, i) => {
          const h = (day.active_players / max) * 100;
          return (
            <button
              key={day.day}
              type="button"
              className="group flex h-full flex-1 flex-col justify-end outline-none"
              aria-label={fmt(A.activityTip, {
                day: shortDay(day.day, digits),
                active: formatNumber(day.active_players, digits),
                new: formatNumber(day.new_players, digits),
                done: formatNumber(day.completions, digits),
              })}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
            >
              <span
                className={cn(
                  'block w-full rounded-t-[4px] transition-opacity',
                  day.active_players > 0 ? 'bg-accent' : 'bg-line',
                  shown === i ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
                  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent',
                )}
                style={{ height: `${Math.max(day.active_players > 0 ? 3 : 1.5, h)}%` }}
              />
            </button>
          );
        })}
      </div>
      <div dir="ltr" className="flex gap-0.5 text-xs text-muted" aria-hidden="true">
        {activity.map((day, i) => (
          <span key={day.day} className="flex-1 text-center">
            {i % 2 === activity.length % 2 ? shortDay(day.day, digits) : ''}
          </span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">{A.activityTable}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="num w-full">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-1.5 text-start font-medium">{A.colDay}</th>
                <th className="py-1.5 text-end font-medium">{A.colActive}</th>
                <th className="py-1.5 text-end font-medium">{A.colNew}</th>
                <th className="py-1.5 text-end font-medium">{A.colCompletions}</th>
              </tr>
            </thead>
            <tbody>
              {[...activity].reverse().map((day) => (
                <tr key={day.day} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5">{shortDay(day.day, digits)}</td>
                  <td className="py-1.5 text-end">{formatNumber(day.active_players, digits)}</td>
                  <td className="py-1.5 text-end">{formatNumber(day.new_players, digits)}</td>
                  <td className="py-1.5 text-end">{formatNumber(day.completions, digits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

function Universities({ rows, digits }: { rows: AdminDashboard['universities']; digits: DigitStyle }) {
  const max = Math.max(1, ...rows.map((r) => r.players));
  return (
    <Card as="section" padding="md" className="flex min-w-0 flex-col gap-3" aria-labelledby="uni-title">
      <h2 id="uni-title" className="text-lg">
        {A.universitiesTitle}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((r) => (
          <li key={r.university ?? 'none'} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate">{universityName(r.university)}</span>
              <Num className="font-medium">{formatNumber(r.players, digits)}</Num>
            </div>
            <span className="block h-2 rounded-full bg-line/60">
              <span
                className="block h-2 rounded-full bg-accent"
                style={{ width: `${Math.max(2, (r.players / max) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ------------------------------------------------------------------ feedback

function FilterChips<S extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: S | 'all';
  options: S[];
  labels: Record<S, string>;
  onChange: (v: S | 'all') => void;
}) {
  const all: (S | 'all')[] = ['all', ...options];
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {all.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            'min-h-10 rounded-full border px-4 text-sm font-medium transition',
            value === o ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface hover:border-ink/40',
          )}
        >
          {o === 'all' ? A.filterAll : labels[o as S]}
        </button>
      ))}
    </div>
  );
}

/** Loads a list for the current filter; `items` is null while that filter's request is in flight. */
function useAdminList<T, S extends string>(load: (s?: S) => Promise<T[]>, filter: S | 'all', nonce: number) {
  const key = `${filter}:${nonce}`;
  const [res, setRes] = useState<{ key: string; items?: T[]; error?: unknown }>({ key: '' });
  useEffect(() => {
    let cancelled = false;
    load(filter === 'all' ? undefined : filter)
      .then((items) => !cancelled && setRes({ key, items }))
      .catch((error: unknown) => !cancelled && setRes({ key, error }));
    return () => {
      cancelled = true;
    };
  }, [load, filter, key]);
  return res.key === key ? res : { key, items: undefined, error: undefined };
}

function FeedbackInbox({ digits, onChanged }: { digits: DigitStyle; onChanged: () => void }) {
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('new');
  const [nonce, setNonce] = useState(0);
  const [overrides, setOverrides] = useState<Record<number, FeedbackStatus>>({});
  const [saveError, setSaveError] = useState(false);
  const res = useAdminList(adminListFeedback, filter, nonce);

  async function setStatus(id: number, s: FeedbackStatus) {
    setSaveError(false);
    setOverrides((o) => ({ ...o, [id]: s }));
    try {
      await adminSetFeedbackStatus(id, s);
      onChanged();
    } catch {
      setSaveError(true);
      setOverrides((o) => {
        const next = { ...o };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-label={A.tabs.feedback}>
      <FilterChips
        value={filter}
        options={FEEDBACK_STATUSES}
        labels={A.feedbackStatus}
        onChange={(v) => {
          setFilter(v);
          setOverrides({});
        }}
      />
      {saveError ? (
        <p role="alert" className="text-sm text-tier-red">
          {A.saveFailed}
        </p>
      ) : null}
      {res.error ? (
        <ErrorState error={res.error} onRetry={() => setNonce((n) => n + 1)} />
      ) : !res.items ? (
        <div className="flex justify-center py-10">
          <Spinner size={26} />
        </div>
      ) : res.items.length === 0 ? (
        <p className="py-10 text-center text-muted">{A.feedbackEmpty}</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {res.items.map((f) => {
            const status = overrides[f.id] ?? f.status;
            return (
              <li key={f.id}>
                <Card padding="md" className={cn('flex h-full flex-col gap-3', status !== 'new' && 'opacity-75')}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-full px-3 py-0.5 text-sm font-medium',
                        f.kind === 'bug' ? 'bg-tier-red/12 text-tier-red' : 'bg-accent/10 text-accent',
                      )}
                    >
                      {A.feedbackKinds[f.kind]}
                    </span>
                    {f.rating ? (
                      <span
                        className="text-2xl"
                        role="img"
                        aria-label={fmt(A.ratingOf, { n: formatNumber(f.rating, digits) })}
                        title={fmt(A.ratingOf, { n: formatNumber(f.rating, digits) })}
                      >
                        {FACES[f.rating - 1]}
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 leading-[1.8] whitespace-pre-wrap">{f.message}</p>
                  {f.contact ? (
                    <p className="m-0 text-sm">
                      <span className="text-muted">{A.contact}: </span>
                      <bdi dir="ltr" className="font-medium select-all">
                        {f.contact}
                      </bdi>
                    </p>
                  ) : null}
                  <p className="m-0 mt-auto text-xs text-muted">
                    {f.display_name ?? A.anonymous}
                    {f.university ? ` · ${universityName(f.university)}` : ''} · {dateTime(f.created_at, digits)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={status === s}
                        aria-label={fmt(A.markAs, { s: A.feedbackStatus[s] })}
                        onClick={() => status !== s && void setStatus(f.id, s)}
                        className={cn(
                          'min-h-9 rounded-full border px-3 text-sm transition',
                          status === s ? 'border-ink bg-ink text-bg' : 'border-line hover:border-ink/40',
                        )}
                      >
                        {A.feedbackStatus[s]}
                      </button>
                    ))}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ submissions

function SubmissionsInbox({ digits, onChanged }: { digits: DigitStyle; onChanged: () => void }) {
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('new');
  const [nonce, setNonce] = useState(0);
  const [overrides, setOverrides] = useState<Record<number, SubmissionStatus>>({});
  const [saveError, setSaveError] = useState(false);
  const res = useAdminList(adminListSubmissions, filter, nonce);

  async function setStatus(id: number, s: SubmissionStatus) {
    setSaveError(false);
    setOverrides((o) => ({ ...o, [id]: s }));
    try {
      await adminSetSubmissionStatus(id, s);
      onChanged();
    } catch {
      setSaveError(true);
      setOverrides((o) => {
        const next = { ...o };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-label={A.tabs.submissions}>
      <FilterChips
        value={filter}
        options={SUBMISSION_STATUSES}
        labels={A.submissionStatus}
        onChange={(v) => {
          setFilter(v);
          setOverrides({});
        }}
      />
      {saveError ? (
        <p role="alert" className="text-sm text-tier-red">
          {A.saveFailed}
        </p>
      ) : null}
      {res.error ? (
        <ErrorState error={res.error} onRetry={() => setNonce((n) => n + 1)} />
      ) : !res.items ? (
        <div className="flex justify-center py-10">
          <Spinner size={26} />
        </div>
      ) : res.items.length === 0 ? (
        <p className="py-10 text-center text-muted">{A.submissionsEmpty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {res.items.map((s: AdminSubmission) => {
            const status = overrides[s.id] ?? s.status;
            return (
              <li key={s.id}>
                <Card padding="md" className="flex flex-col gap-2">
                  <p className="m-0 font-display text-lg leading-[1.6] font-semibold">{s.text_ar}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {s.proposed_answer !== null ? (
                      <span>
                        <span className="text-muted">{A.proposedAnswer}: </span>
                        <Num className="font-medium">{formatNumber(s.proposed_answer, digits)}</Num>
                        {s.unit_ar ? ` ${s.unit_ar}` : ''}
                      </span>
                    ) : null}
                    {s.source_url ? (
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                        {A.source}
                        <Icon name="external" size={14} />
                      </a>
                    ) : null}
                    {s.credit_name ? (
                      <span>
                        <span className="text-muted">{A.credit}: </span>
                        {s.credit_name}
                      </span>
                    ) : null}
                  </div>
                  {s.napkin_ar ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted">{A.napkin}</summary>
                      <p className="m-0 mt-1 leading-[1.8] whitespace-pre-wrap">{s.napkin_ar}</p>
                    </details>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-xs text-muted">
                      {s.display_name ?? A.anonymous} · {dateTime(s.created_at, digits)}
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted">{A.statusLabel}</span>
                      <select
                        id={`sub-status-${s.id}`}
                        value={status}
                        onChange={(e) => void setStatus(s.id, e.target.value as SubmissionStatus)}
                        className="min-h-10 rounded-xl border border-line bg-surface px-3 text-ink"
                      >
                        {SUBMISSION_STATUSES.map((o) => (
                          <option key={o} value={o}>
                            {A.submissionStatus[o]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ question calibration

function Questions({ data, digits }: { data: AdminDashboard; digits: DigitStyle }) {
  const pct = (v: number | null) => (v === null ? '–' : `${formatNumber(Math.round(v), digits)}%`);
  return (
    <Card as="section" padding="md" className="flex flex-col gap-3" aria-labelledby="q-title">
      <div className="flex flex-col gap-1">
        <h2 id="q-title" className="text-lg">
          {A.questionsTitle}
        </h2>
        <p className="text-sm text-muted">{A.questionsCaption}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-2 text-start font-medium">{A.colPuzzle}</th>
              <th className="py-2 text-start font-medium">{A.colQuestion}</th>
              <th className="py-2 text-end font-medium">{A.colPlayers}</th>
              <th className="py-2 text-end font-medium">{A.colMedian}</th>
              <th className="py-2 text-end font-medium">{A.colLow}</th>
              <th className="py-2 text-end font-medium">{A.colHigh}</th>
              <th className="py-2 text-start font-medium">{A.colFlag}</th>
            </tr>
          </thead>
          <tbody>
            {data.questions.map((q) => {
              const flags: string[] = [];
              if (q.players >= 20 && q.median_multiple !== null) {
                if (q.position === 1 && q.median_multiple > 5) flags.push(A.flagQ1Hard);
                if (q.position === 3 && q.median_multiple < 2) flags.push(A.flagQ3Easy);
                if ((q.pct_low ?? 0) >= 75) flags.push(A.flagBiasLow);
                if ((q.pct_high ?? 0) >= 75) flags.push(A.flagBiasHigh);
              }
              return (
                <tr key={q.question_id} className="border-b border-line/60 align-top last:border-0">
                  <td className="num py-2 whitespace-nowrap">
                    {localizeDigits(`${q.puzzle_number}/${q.position}`, digits)}
                  </td>
                  <td className="max-w-[28rem] py-2 leading-[1.6]">{localizeDigits(q.text_ar, digits)}</td>
                  <td className="num py-2 text-end">{formatNumber(q.players, digits)}</td>
                  <td className="num py-2 text-end">
                    {q.median_multiple !== null ? <Num>{formatMultiple(q.median_multiple, digits)}</Num> : '–'}
                  </td>
                  <td className="num py-2 text-end">{pct(q.pct_low)}</td>
                  <td className="num py-2 text-end">{pct(q.pct_high)}</td>
                  <td className="py-2">
                    {flags.length ? (
                      <span className="rounded-full bg-tier-orange/12 px-2 py-0.5 text-xs font-medium text-tier-orange">
                        {flags.join(' · ')}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
