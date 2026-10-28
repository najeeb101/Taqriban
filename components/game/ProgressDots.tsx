'use client';
// ProgressDots — one dot per question. Props: total, done (number answered, from the start), current? (index of the
// question being answered, outlined), className?. Has an accessible text label «أجبت عن X من Y».
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';

export function ProgressDots({
  total,
  done,
  current,
  className,
}: {
  total: number;
  done: number;
  current?: number | null;
  className?: string;
}) {
  const { digitStyle } = usePrefs();
  const label = fmt(t.game.progressLabel, {
    done: formatNumber(done, digitStyle),
    total: formatNumber(total, digitStyle),
  });
  return (
    <div className={cn('flex items-center justify-center gap-2.5', className)} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => {
        const filled = i < done;
        const isCurrent = current === i && !filled;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              'grid size-4 place-items-center rounded-full border-2 transition-colors',
              filled ? 'border-accent bg-accent' : isCurrent ? 'border-accent bg-accent/15' : 'border-line bg-transparent',
            )}
          />
        );
      })}
    </div>
  );
}
