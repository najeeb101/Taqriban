'use client';
// Motion helpers for the play flow. Both honour the OS setting and the in-app «reduce motion» switch.
import { useEffect, useState } from 'react';

/** True when the user asked for less motion (OS setting or Settings → reduce motion). Read once on first render. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.reduceMotion === 'true'
  );
}

/** Counts from 0 up to `target` over `ms` (ease-out). Returns `target` straight away when `enabled` is false. */
export function useCountUp(target: number, enabled: boolean, ms = 1100): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, ms]);

  return enabled ? value : target;
}
