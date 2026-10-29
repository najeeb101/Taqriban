// Card — paper-like surface with a hairline border.
// Props: as? (element tag, default 'div'), padding? ('none' | 'sm' | 'md' | 'lg', default 'md'),
//   tone? ('surface' | 'plain' | 'accent', default 'surface'), className?, plus native div props.
import type { HTMLAttributes, ElementType } from 'react';
import { cn } from './cn';

const PAD = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-7' } as const;
const TONE = {
  surface: 'bg-surface border-line shadow-card',
  plain: 'bg-transparent border-line',
  accent: 'bg-accent/10 border-accent/30',
} as const;

export function Card({
  as,
  padding = 'md',
  tone = 'surface',
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: keyof typeof PAD;
  tone?: keyof typeof TONE;
}) {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag className={cn('rounded-3xl border', TONE[tone], PAD[padding], className)} {...rest} />;
}
