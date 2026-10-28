import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { ServiceWorkerRegister } from '@/components/social/ServiceWorkerRegister';
import { AppShell } from '@/components/shell/AppShell';
import { t } from '@/lib/i18n';
import './globals.css';

const plex = IBM_Plex_Sans_Arabic({
  weight: ['400', '500', '700'],
  subsets: ['arabic', 'latin'],
  variable: '--font-plex',
  display: 'swap',
});

const reem = Reem_Kufi({
  subsets: ['arabic', 'latin'],
  variable: '--font-reem',
  display: 'swap',
});

export const metadata: Metadata = {
  title: t.common.title,
  description: t.common.tagline,
  manifest: '/manifest.webmanifest',
  applicationName: t.common.appName,
  appleWebApp: { capable: true, title: t.common.appName, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4EFE6' },
    { media: '(prefers-color-scheme: dark)', color: '#16201B' },
  ],
};

// Runs before first paint: applies the saved theme + reduce-motion preference (no flash).
const THEME_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme')||'auto';var dark=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.dataset.theme=dark?'dark':'light';if(localStorage.getItem('reduceMotion')==='1')d.dataset.reduceMotion='true';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${plex.variable} ${reem.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
