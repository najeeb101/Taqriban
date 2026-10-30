'use client';
// Account pieces for /profile. GuestBanner: why to make an account. AccountEmail: the email row of the account card
// (guest: link email = create account; signed in: email + sign out). SignInCard: guests who already have an account.
import { useState, type FormEvent, type ReactNode } from 'react';
import { usePlayer } from '@/components/providers/PlayerProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';
import { ApiError, linkEmail, signInWithEmail, signOut } from '@/lib/api';
import { errorMessage, t } from '@/lib/i18n';
import { ConfirmSheet } from './ConfirmSheet';
import { Field, describedBy, inputClasses } from './Field';
import { isValidEmail } from './utils';

const A = t.social.accountSection;

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
    return (
      <EmailForm id="link" hint={A.linkHint} button={A.linkButton} primary sentMessage={A.linkSent} action={linkEmail} />
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
      </EmailForm>
    </Card>
  );
}
