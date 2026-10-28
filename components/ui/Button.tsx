'use client';
// Button — primary / secondary / ghost, 44px+ tap targets.
// Props: variant ('primary' | 'secondary' | 'ghost', default 'primary'), size ('sm' | 'md' | 'lg', default 'md'),
//   loading? (shows spinner, disables), fullWidth?, icon? (ReactNode before the label), plus native <button> props.
// Also exports buttonClasses() to style links, and ButtonLink (next/link with button styling).
import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-card hover:brightness-110 active:brightness-95 border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:border-ink/40 active:bg-ink/5',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-ink/5 active:bg-ink/10',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-[0.9375rem]',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium no-underline transition',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
    VARIANT[variant],
    SIZE[size],
    fullWidth && 'w-full',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  fullWidth,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={18} /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean }) {
  return <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest} />;
}
