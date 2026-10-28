// Public site URL used in share text / cards: NEXT_PUBLIC_SITE_URL, else the current origin.
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const base = env && env.trim() ? env.trim() : typeof window !== 'undefined' ? window.location.origin : '';
  return base.replace(/\/+$/, '');
}
