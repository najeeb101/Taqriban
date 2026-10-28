/* تقريباً — service worker (app-shell caching).
 * - Same-origin GET only. Cross-origin (Supabase API) and non-GET requests are never touched.
 * - Cache-first: /_next/static/*, /icons/*, fonts, icon files.
 * - Network-first with cached fallback: navigations (offline page as last resort).
 * Bump VERSION to invalidate old caches. */
const VERSION = 'v1';
const STATIC_CACHE = `taqriban-static-${VERSION}`;
const PAGES_CACHE = `taqriban-pages-${VERSION}`;
const PRECACHE = ['/', '/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('taqriban-') && k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/apple-icon.png' ||
    /\.(?:woff2?|ttf|otf|png|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never cache cross-origin (Supabase, fonts CDN, analytics)

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES_CACHE);
          return (
            (await cache.match(req)) ||
            (await cache.match('/')) ||
            (await cache.match('/offline.html')) ||
            Response.error()
          );
        }),
    );
  }
});
