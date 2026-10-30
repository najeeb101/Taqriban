'use client';
// GroupScreen — /groups/[code]: join prompt for non-members; invite card, today panel, leaderboard,
// owner tools and leave for members. Guests (no account) only see the group name and a «create an account» button.
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { Sheet } from '@/components/ui/Sheet';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { ApiError, getGroup, joinGroup, leaveGroup, regenerateCode, removeMember, renameGroup } from '@/lib/api';
import { formatMultiple, localizeDigits } from '@/lib/format';
import { errorMessage, fmt, t } from '@/lib/i18n';
import { TIER_SQUARE, tier } from '@/lib/scoring';
import type { GroupDetail, GroupMember } from '@/lib/types';
import { ConfirmSheet } from './ConfirmSheet';
import { Field, describedBy, inputClasses } from './Field';
import { LeaderboardPanel } from './LeaderboardPanel';
import { useAsync } from './useAsync';
import { inviteUrl, isValidGroupName, normalizeJoinCode, sortMembersToday, whatsappUrl } from './utils';

const noopSubscribe = () => () => {};
const useCanShare = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );
const useOrigin = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  );

type Pending = { kind: 'leave' } | { kind: 'regen' } | { kind: 'remove'; member: GroupMember } | null;

export function GroupScreen() {
  const { authState } = usePlayer();
  const params = useParams<{ code: string }>();
  const code = normalizeJoinCode(decodeURIComponent(String(params.code ?? '')));
  const { data, error, loading, reload } = useAsync(`group|${code}`, () => getGroup(code));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={32} />
      </div>
    );
  }
  if (error) return <ErrorState error={error} message={t.social.group.loadError} onRetry={reload} />;
  if (!data) {
    return (
      <EmptyState
        icon="users"
        title={t.social.group.notFoundTitle}
        description={t.social.group.notFoundBody}
        action={<ButtonLink href="/groups">{t.social.group.back}</ButtonLink>}
      />
    );
  }
  if (!authState || authState.isAnonymous) return <JoinView group={data} code={code} reload={reload} guest />;
  return data.is_member ? (
    <MemberView group={data} urlCode={code} reload={reload} />
  ) : (
    <JoinView group={data} code={code} reload={reload} />
  );
}

function BackLink() {
  return (
    <Link href="/groups" className="inline-flex min-h-11 items-center gap-1 text-muted no-underline hover:text-ink">
      <Icon name="chevron" size={18} className="rotate-180" />
      {t.social.group.back}
    </Link>
  );
}

function MemberCount({ n }: { n: number }) {
  const { digitStyle } = usePrefs();
  return (
    <span>{n === 1 ? t.social.groups.memberOne : localizeDigits(fmt(t.social.groups.members, { n }), digitStyle)}</span>
  );
}

function JoinView({ group, code, reload, guest }: { group: GroupDetail; code: string; reload: () => void; guest?: boolean }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function join() {
    setBusy(true);
    try {
      await joinGroup(code);
      toast(t.social.groups.joined, { tone: 'success' });
      reload();
    } catch (err) {
      toast(errorMessage((err as ApiError).code), { tone: 'error' });
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon name="users" size={28} />
        </span>
        <p className="text-muted">{t.social.group.joinCardTitle}</p>
        <h1 className="text-3xl">{group.name}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2 text-muted">
          <Chip>{t.social.groupKinds[group.kind]}</Chip>
          <MemberCount n={group.member_count} />
        </div>
        <p className="text-muted">{guest ? t.social.groups.joinNeedsAccount : t.social.group.joinCardBody}</p>
        {guest ? (
          <ButtonLink href="/profile#account" size="lg" fullWidth>
            {t.social.accountSection.createCta}
          </ButtonLink>
        ) : (
          <Button size="lg" fullWidth loading={busy} onClick={join}>
            {t.social.group.joinButton}
          </Button>
        )}
      </Card>
    </div>
  );
}

function InviteCard({ group }: { group: GroupDetail }) {
  const { toast } = useToast();
  const origin = useOrigin();
  const canShare = useCanShare();
  const joinCode = group.join_code ?? '';
  const link = inviteUrl(origin, joinCode);
  const text = fmt(t.social.group.shareText, { name: group.name, url: link });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast(t.social.group.linkCopied, { tone: 'success' });
    } catch {
      toast(t.social.group.copyFailed, { tone: 'error' });
    }
  }
  async function share() {
    try {
      await navigator.share({ title: group.name, text, url: link });
    } catch {
      /* dismissed */
    }
  }

  return (
    <Card as="section" aria-labelledby="invite-title" tone="accent" className="flex flex-col gap-4">
      <h2 id="invite-title" className="text-xl">
        {t.social.group.inviteTitle}
      </h2>
      <div className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface p-4">
        <span className="text-sm text-muted">{t.social.group.inviteCode}</span>
        <span dir="ltr" className="font-mono text-4xl font-bold tracking-[0.25em] text-ink select-all">
          {joinCode}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" fullWidth icon={<Icon name="copy" />} onClick={copy}>
          {t.social.group.copyLink}
        </Button>
        <div className="flex gap-2">
          <a
            href={whatsappUrl(text)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'primary', fullWidth: true })}
          >
            <Icon name="external" />
            {t.social.group.whatsapp}
          </a>
          {canShare ? (
            <Button variant="secondary" fullWidth icon={<Icon name="share" />} onClick={share}>
              {t.social.group.shareNative}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function TodayPanel({ group }: { group: GroupDetail }) {
  const { digitStyle } = usePrefs();
  if (group.hidden) {
    return (
      <Card as="section" aria-labelledby="today-title" className="flex flex-col items-center gap-3 text-center">
        <h2 id="today-title" className="text-xl">
          {t.social.lb.hiddenTitle}
        </h2>
        <p className="text-muted">
          {t.social.group.todayHiddenBody}{' '}
          {localizeDigits(
            group.finishers_today === 1
              ? t.social.lb.finishersOne
              : group.finishers_today === 0
                ? t.social.lb.finishersNone
                : fmt(t.social.lb.finishers, { n: group.finishers_today }),
            digitStyle,
          )}
        </p>
        <ButtonLink href="/play" size="lg">
          <Icon name="target" />
          {t.social.lb.playCta}
        </ButtonLink>
      </Card>
    );
  }
  const members = sortMembersToday(group.members);
  const done = members.filter((m) => m.finished_today).length;
  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="today-title" className="text-xl">
          {t.social.group.todayTitle}
        </h2>
        <p className="text-sm text-muted">
          {localizeDigits(fmt(t.social.group.finishersLine, { done, total: members.length }), digitStyle)}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li
            key={m.player_id}
            className={cn(
              'flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2',
              m.is_me ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface',
              !m.finished_today && 'opacity-75',
            )}
          >
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full',
                m.finished_today ? 'bg-tier-green/15 text-tier-green' : 'bg-ink/5 text-muted',
              )}
              role="img"
              aria-label={m.finished_today ? t.social.group.finished : t.social.group.notFinished}
            >
              {m.finished_today ? <Icon name="check" size={18} /> : <span aria-hidden="true">·</span>}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">
                {m.display_name}
                {m.is_me ? (
                  <span className="ms-2 text-sm font-normal text-accent">({t.social.group.meBadge})</span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                {m.is_owner ? <span>{t.social.group.ownerBadge}</span> : null}
                {m.streak > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="flame" size={14} filled className="text-accent" />
                    {localizeDigits(fmt(t.social.group.streak, { n: m.streak }), digitStyle)}
                  </span>
                ) : null}
              </span>
            </span>
            {m.finished_today && m.today_score != null ? (
              <span className="shrink-0 font-bold">
                <span aria-hidden="true" className="me-1.5">
                  {TIER_SQUARE[tier(m.today_score)]}
                </span>
                <Num>{formatMultiple(m.today_score, digitStyle)}</Num>
              </span>
            ) : (
              <span className="shrink-0 text-sm text-muted">
                {m.finished_today ? t.social.group.finished : t.social.group.notFinished}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ManageSheet({
  group,
  open,
  onClose,
  onRenamed,
  onRegen,
  onRemove,
}: {
  group: GroupDetail;
  open: boolean;
  onClose: () => void;
  onRenamed: () => void;
  onRegen: () => void;
  onRemove: (m: GroupMember) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(group.name);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function rename() {
    if (!isValidGroupName(name)) {
      setErr(t.social.groups.nameInvalid);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await renameGroup(group.id, name.trim().replace(/\s+/g, ' '));
      toast(t.social.group.renamed, { tone: 'success' });
      onRenamed();
    } catch (e) {
      setErr(errorMessage((e as ApiError).code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.social.group.ownerToolsTitle}>
      <div className="flex flex-col gap-6">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
          noValidate
        >
          <Field id="rename" label={t.social.group.renameLabel} error={err}>
            <input
              id="rename"
              className={inputClasses}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={err ? true : undefined}
              aria-describedby={describedBy('rename', undefined, err)}
            />
          </Field>
          <Button type="submit" loading={busy} fullWidth>
            {t.social.group.renameButton}
          </Button>
        </form>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-lg">{t.social.group.regenTitle}</h3>
          <p className="text-sm text-muted">{t.social.group.regenBody}</p>
          <Button variant="secondary" fullWidth onClick={onRegen}>
            {t.social.group.regenButton}
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-lg">{t.social.group.membersTitle}</h3>
          <ul className="flex flex-col gap-2">
            {group.members
              .filter((m) => !m.is_me)
              .map((m) => (
                <li key={m.player_id} className="flex min-h-12 items-center justify-between gap-3">
                  <span className="truncate">{m.display_name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-tier-red"
                    aria-label={fmt(t.social.group.removeMember, { name: m.display_name })}
                    onClick={() => onRemove(m)}
                  >
                    {t.common.actions.delete}
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}

function MemberView({ group, urlCode, reload }: { group: GroupDetail; urlCode: string; reload: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [manageOpen, setManageOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'leave') {
        await leaveGroup(group.id);
        toast(t.social.group.left, { tone: 'success' });
        router.push('/groups');
        return;
      }
      if (pending.kind === 'regen') {
        const next = await regenerateCode(group.id);
        toast(t.social.group.regenDone, { tone: 'success' });
        setPending(null);
        if (next && next !== urlCode) router.replace(`/groups/${next}`);
        else reload();
      } else {
        await removeMember(group.id, pending.member.player_id);
        toast(t.social.group.removed, { tone: 'success' });
        setPending(null);
        reload();
      }
    } catch (err) {
      toast(errorMessage((err as ApiError).code), { tone: 'error' });
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  const confirmCfg =
    pending?.kind === 'leave'
      ? {
          title: t.social.group.leaveTitle,
          body: (
            <>
              <p>{fmt(t.social.group.leaveBody, { name: group.name })}</p>
              {group.is_owner ? <p className="mt-2 font-medium text-ink">{t.social.group.leaveBodyOwner}</p> : null}
            </>
          ),
          label: t.social.group.leaveConfirm,
        }
      : pending?.kind === 'regen'
        ? {
            title: t.social.group.regenTitle,
            body: <p>{t.social.group.regenBody}</p>,
            label: t.social.group.regenConfirm,
          }
        : pending?.kind === 'remove'
          ? {
              title: t.social.group.removeTitle,
              body: <p>{fmt(t.social.group.removeBody, { name: pending.member.display_name })}</p>,
              label: t.social.group.removeConfirm,
            }
          : { title: '', body: null, label: '' };

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">{group.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-muted">
          <Chip>{t.social.groupKinds[group.kind]}</Chip>
          <MemberCount n={group.member_count} />
          {group.is_owner ? <Chip tone="accent">{t.social.group.ownerBadge}</Chip> : null}
        </div>
      </header>

      <InviteCard group={group} />
      <TodayPanel group={group} />

      <section aria-labelledby="board-title" className="flex flex-col gap-3">
        <h2 id="board-title" className="text-xl">
          {t.social.group.boardTitle}
        </h2>
        <LeaderboardPanel groupId={group.id} idPrefix="grp" />
      </section>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        {group.is_owner ? (
          <Button variant="secondary" fullWidth icon={<Icon name="settings" />} onClick={() => setManageOpen(true)}>
            {t.social.group.manage}
          </Button>
        ) : null}
        <Button variant="ghost" fullWidth className="text-tier-red" onClick={() => setPending({ kind: 'leave' })}>
          {t.social.group.leaveButton}
        </Button>
      </div>

      {group.is_owner ? (
        <ManageSheet
          key={group.name}
          group={group}
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          onRenamed={() => {
            setManageOpen(false);
            reload();
          }}
          onRegen={() => {
            setManageOpen(false);
            setPending({ kind: 'regen' });
          }}
          onRemove={(member) => {
            setManageOpen(false);
            setPending({ kind: 'remove', member });
          }}
        />
      ) : null}

      <ConfirmSheet
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        title={confirmCfg.title}
        body={confirmCfg.body}
        confirmLabel={confirmCfg.label}
        loading={busy}
        onConfirm={confirm}
      />
    </div>
  );
}
