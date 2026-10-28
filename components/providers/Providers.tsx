'use client';
// Providers — Prefs > Toast > Player. Mounted once in app/layout.tsx; pages never need to add these again.
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { PlayerProvider } from './PlayerProvider';
import { PrefsProvider } from './PrefsProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <ToastProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </ToastProvider>
    </PrefsProvider>
  );
}
