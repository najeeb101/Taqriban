'use client';
// Account pieces for /profile. GuestBanner: why to make an account. AccountEmail: the email row of the account card
// (guest: link Google or email = create account; signed in: email + sign out). SignInCard: guests who already have an
// account (Google or email link).
// AccountRequiredCard: shown wherever a feature needs an account (leaderboard ranking, groups); links to the account card.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import {
  ApiError,
  linkEmail,
  linkGoogle,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  takeAuthRedirectError,
} from '@/lib/api';
import { errorMessage, t } from '@/lib/i18n';
import { ConfirmSheet } from './ConfirmSheet';
import { Field, describedBy, inputClasses } from './Field';
import { isValidEmail } from './utils';

const A = t.social.accountSection;
// Google buttons stay hidden until the provider is configured in Supabase (set NEXT_PUBLIC_GOOGLE_AUTH=1).
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1';

function GoogleButton({ label, action }: { label: string; action: () => Promise<void> }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await action(); // navigates to Google; on success the page unloads
    } catch (err) {
      toast(errorMessage((err as ApiError).code), { tone: 'error' });
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="secondary" loading={busy} fullWidth onClick={onClick}>
      <span className="flex items-center justify-center gap-2">
        <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {label}
      </span>
    </Button>
  );
}

/** Shows the error a Google (or email-link) redirect came back with, once. */
function useAuthRedirectError() {
  const { toast } = useToast();
  useEffect(() => {
    const err = takeAuthRedirectError();
    if (err) toast(errorMessage(err.code), { tone: 'error' });
  }, [toast]);
}

function EmailForm({
  id,
  hint,
  children,
  button,
  primary,
  sentMessage,
  action,
}: {
  id: string;
  hint?: string;
  children?: ReactNode;
  button: string;
  primary?: boolean;
  sentMessage: string;
  action: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError(A.emailInvalid);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await action(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage((err as ApiError).code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {children}
      {sent ? (
        <p role="status" className="flex gap-2 rounded-xl border border-tier-green/40 bg-tier-green/10 p-3">
          <Icon name="check" size={18} className="mt-1 shrink-0 text-tier-green" />
          <span>{sentMessage}</span>
        </p>
      ) : (
        <>
          <Field id={`${id}-email`} label={A.emailLabel} hint={hint} error={error}>
            <input
              id={`${id}-email`}
              type="email"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              className={cn(inputClasses, 'text-start')}
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(`${id}-email`, hint, error)}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
          </Field>
          <Button type="submit" variant={primary ? 'primary' : 'secondary'} loading={busy} fullWidth>
            {button}
          </Button>
        </>
      )}
    </form>
  );
}

export function AccountRequiredCard({
  id,
  icon,
  title,
  body,
}: {
  id: string;
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <Card as="section" tone="accent" aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Icon name={icon} size={22} className="mt-0.5 shrink-0 text-accent" />
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-lg">
            {title}
          </h2>
          <p className="text-sm text-muted">{body}</p>
        </div>
      </div>
      <ButtonLink href="/profile#account" fullWidth>
        {A.createCta}
      </ButtonLink>
    </Card>
  );
}

export function GuestBanner() {
  return (
    <Card tone="accent" className="flex gap-3">
      <Icon name="flame" size={24} filled className="mt-1 shrink-0 text-accent" />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl">{A.guestTitle}</h2>
        <p className="text-muted">{A.guestBody}</p>
      </div>
    </Card>
  );
}

export function AccountEmail() {
  const { status, authState } = usePlayer();
  const { toast } = useToast();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useAuthRedirectError();

  async function doSignOut() {
    setBusy(true);
    try {
      await signOut();
      toast(A.signedOut, { tone: 'success' });
      setSignOutOpen(false);
    } catch (err) {
      toast(errorMessage((err as ApiError).code), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading' || !authState) {
    return (
      <div className="flex justify-center py-3">
        <Spinner />
      </div>
    );
  }

  if (authState.isAnonymous) {
    const emailForm = (
      <EmailForm
        id="link"
        hint={A.linkHint}
        button={A.linkButton}
        primary={!GOOGLE}
        sentMessage={A.linkSent}
        action={linkEmail}
      />
    );
    if (!GOOGLE) return emailForm;
    return (
      <div className="flex flex-col gap-3">
        <GoogleButton label={A.googleLink} action={linkGoogle} />
        <p className="text-center text-sm text-muted">{A.orEmail}</p>
        {emailForm}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{A.signedInAs}</span>
        <span dir="ltr" className="break-all text-start text-lg">
          {authState.email}
        </span>
      </div>
      <Button variant="secondary" fullWidth onClick={() => setSignOutOpen(true)}>
        {A.signOutButton}
      </Button>
      <ConfirmSheet
        open={signOutOpen}
        onClose={() => !busy && setSignOutOpen(false)}
        title={A.signOutTitle}
        body={<p>{A.signOutBody}</p>}
        confirmLabel={A.signOutConfirm}
        loading={busy}
        onConfirm={doSignOut}
      />
    </div>
  );
}

export function SignInCard() {
  return (
    <Card as="section" aria-labelledby="signin-title">
      <EmailForm id="signin" button={A.signInButton} sentMessage={A.signInSent} action={signInWithEmail}>
        <h2 id="signin-title" className="text-lg">
          {A.signInTitle}
        </h2>
        <p className="text-muted">{A.signInBody}</p>
        <p className="flex gap-2 rounded-xl border border-tier-yellow/40 bg-tier-yellow/10 p-3 text-sm">
          <Icon name="alert" size={18} className="mt-1 shrink-0 text-tier-yellow" />
          <span>{A.signInWarn}</span>
        </p>
        {GOOGLE && (
          <>
            <GoogleButton label={A.googleSignIn} action={signInWithGoogle} />
            <p className="text-center text-sm text-muted">{A.orEmail}</p>
          </>
        )}
      </EmailForm>
    </Card>
  );
}
