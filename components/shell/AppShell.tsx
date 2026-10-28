'use client';
// AppShell — skip link + Header + NavDrawer + centred <main> (max ~32rem, 16px gutters).
// Props: children (page content). Pages should NOT add their own <main>; use sections/divs inside.
import { useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { Header } from './Header';
import { NavDrawer } from './NavDrawer';

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        {t.common.nav.skipToContent}
      </a>
      <Header onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main id="main" className="mx-auto w-full max-w-[32rem] px-4 pt-6 pb-20">
        {children}
      </main>
    </>
  );
}
