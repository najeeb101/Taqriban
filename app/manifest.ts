import type { MetadataRoute } from 'next';
import { t } from '@/lib/i18n';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t.common.title,
    short_name: t.common.appName,
    description: t.common.tagline,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#F4EFE6',
    theme_color: '#B4441C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
