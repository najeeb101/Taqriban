// Chip — small pill label.
// Props: tone? ('neutral' | 'accent' | 'green' | 'yellow' | 'orange' | 'red', default 'neutral'),
//   icon? (ReactNode), className?, children. Tier tones should always be paired with a word/arrow, never colour alone.
import type { ReactNode } from 'react';
import { cn } from './cn';

export type ChipTone = 'neutral' | 'accent' | 'green' | 'yellow' | 'orange' | 'red';

const TONE: Record<ChipTone, string> = {
  neutral: 'bg-ink/5 text-muted border-line',
  accent: 'bg-accent/10 text-accent border-accent/30',
  green: 'bg-tier-green/12 text-tier-green border-tier-green/40',
  yellow: 'bg-tier-yellow/15 text-tier-yellow border-tier-yellow/40',
  orange: 'bg-tier-orange/12 text-tier-orange border-tier-orange/40',
  red: 'bg-tier-red/12 text-tier-red border-tier-red/40',
};

export function Chip({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: ChipTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-medium leading-7',
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
