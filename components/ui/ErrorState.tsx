'use client';
// ErrorState — error message with an optional retry button.
// Props: error? (ApiError / any error: message is derived from its `code`), message? (overrides), title?,
//   onRetry? (shows «أعد المحاولة»), className?.
import { errorMessage, t } from '@/lib/i18n';
import { cn } from './cn';
import { Button } from './Button';
import { Icon } from './Icon';

export function ErrorState({
  error,
  message,
  title,
  onRetry,
  className,
}: {
  error?: unknown;
  message?: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const code = (error as { code?: string } | null | undefined)?.code;
  const text = message ?? errorMessage(code);
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span className="grid size-14 place-items-center rounded-full border border-tier-red/40 bg-tier-red/10 text-tier-red">
        <Icon name="alert" size={26} />
      </span>
      <h2 className="text-xl">{title ?? t.common.errors.title}</h2>
      <p className="max-w-[26rem] text-muted">{text}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {t.common.actions.retry}
        </Button>
      ) : null}
    </div>
  );
}
