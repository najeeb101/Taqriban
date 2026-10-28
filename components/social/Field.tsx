// Field — labelled form control wrapper with hint + error text, plus shared input classes.
// Props: id (control id), label, hint?, error?, children (the control; give it aria-describedby={describedBy(id, hint, error)}).
import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

export const inputClasses =
  'block w-full min-h-12 rounded-xl border border-line bg-surface px-4 py-2 text-base text-ink placeholder:text-muted/70 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 aria-[invalid=true]:border-tier-red';

export function describedBy(id: string, hint?: string, error?: string | null): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return ids || undefined;
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-tier-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
