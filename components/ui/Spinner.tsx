// Spinner — loading ring with an accessible label.
// Props: size? (px, default 24), label? (screen-reader text, default «جارٍ التحميل»), className?.
import { t } from '@/lib/i18n';
import { cn } from './cn';

export function Spinner({ size = 24, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label ?? t.common.a11y.loading}</span>
    </span>
  );
}
