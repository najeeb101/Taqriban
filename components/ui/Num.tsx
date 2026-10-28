// Num — isolates numbers / LTR fragments inside Arabic text so they never get reordered.
// Props: children (already-formatted text), className?. Works in server and client components.
import type { ReactNode } from 'react';
import { cn } from './cn';

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" style={{ unicodeBidi: 'isolate' }} className={cn('num', className)}>
      {children}
    </bdi>
  );
}
