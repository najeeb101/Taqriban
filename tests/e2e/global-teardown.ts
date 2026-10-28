import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/** Deletes every user created since the run started (anonymous browser users, test accounts). */
export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const since = new Date(readFileSync('test-results/.e2e-start', 'utf8')).getTime();
  const svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let page = 1; page < 50; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if (new Date(u.created_at).getTime() >= since - 1000) await svc.auth.admin.deleteUser(u.id);
    }
    if (data.users.length < 200) break;
  }
}
