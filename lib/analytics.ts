// Optional privacy-friendly analytics (Plausible). No-op unless window.plausible exists.
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function track(event: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    /* ignore */
  }
}
