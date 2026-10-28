'use client';
// PrefsProvider — local, per-device preferences (localStorage; no flash thanks to the inline script in layout.tsx).
// usePrefs() -> {
//   digitStyle: 'latn' | 'arab', setDigitStyle(style)      // also saves to the profile, best-effort
//   theme: 'auto' | 'light' | 'dark', setTheme(theme)       // applies data-theme on <html>
//   reduceMotion: boolean, setReduceMotion(on)              // applies data-reduce-motion on <html>
//   adoptServerDigitStyle(style)                            // used by PlayerProvider: only applies if nothing stored locally
// }
// Handy: const { digitStyle } = usePrefs(); formatNumber(n, digitStyle).
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { updateProfile } from '@/lib/api';
import type { DigitStyle, ThemePref } from '@/lib/types';

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode etc.: keep going without persistence */
  }
  memory[key] = value;
  listeners.forEach((l) => l());
}
const memory: Record<string, string> = {};

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}
function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key) ?? memory[key] ?? null,
    () => null,
  );
}

export interface PrefsValue {
  digitStyle: DigitStyle;
  setDigitStyle: (style: DigitStyle) => void;
  theme: ThemePref;
  setTheme: (theme: ThemePref) => void;
  reduceMotion: boolean;
  setReduceMotion: (on: boolean) => void;
  adoptServerDigitStyle: (style: DigitStyle) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const rawDigits = useStored('digitStyle');
  const rawTheme = useStored('theme');
  const rawMotion = useStored('reduceMotion');

  const digitStyle: DigitStyle = rawDigits === 'arab' ? 'arab' : 'latn';
  const theme: ThemePref = rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : 'auto';
  const reduceMotion = rawMotion === '1';

  // Apply theme to <html>; in 'auto' follow the system scheme live.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    if (theme !== 'auto') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) root.dataset.reduceMotion = 'true';
    else delete root.dataset.reduceMotion;
  }, [reduceMotion]);

  const setDigitStyle = useCallback((style: DigitStyle) => {
    write('digitStyle', style);
    updateProfile({ digit_style: style }).catch(() => {
      /* best effort: the local preference already applies */
    });
  }, []);
  const setTheme = useCallback((next: ThemePref) => write('theme', next), []);
  const setReduceMotion = useCallback((on: boolean) => write('reduceMotion', on ? '1' : '0'), []);
  const adoptServerDigitStyle = useCallback((style: DigitStyle) => {
    if (read('digitStyle') === null && memory.digitStyle === undefined) write('digitStyle', style);
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({ digitStyle, setDigitStyle, theme, setTheme, reduceMotion, setReduceMotion, adoptServerDigitStyle }),
    [digitStyle, setDigitStyle, theme, setTheme, reduceMotion, setReduceMotion, adoptServerDigitStyle],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
