// Browser Supabase client (singleton) + anonymous session bootstrap.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let sessionPromise: Promise<Session> | null = null;

/** Throws at CALL time (not import time) when env is missing so `next build` works without Supabase. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).');
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/** Returns the current session, signing in anonymously first if there is none. Memoised. */
export function ensureSession(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      const res = await supabase.auth.signInAnonymously();
      if (res.error || !res.data.session) throw res.error ?? new Error('anonymous sign-in failed');
      return res.data.session;
    })().catch((e) => {
      sessionPromise = null;
      throw e;
    });
  }
  return sessionPromise;
}

/** Forget the memoised session (after sign-out / data deletion). */
export function resetSession(): void {
  sessionPromise = null;
}
