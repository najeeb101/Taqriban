/* Manages who can open /admin (service role). The admin must also sign in with that email in the app (Settings).
 * Usage: npm run admin -- list | add <email> | remove <email>
 */
import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may already be set */
}

async function main() {
  const [cmd, rawEmail] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = rawEmail?.trim().toLowerCase();

  if (cmd === 'add' && email) {
    const { error } = await sb.from('admins').upsert({ email }, { onConflict: 'email' });
    if (error) throw new Error(error.message);
    console.log(`Added ${email}. Sign in with this email in the app (Settings), then open /admin.`);
  } else if (cmd === 'remove' && email) {
    const { error } = await sb.from('admins').delete().eq('email', email);
    if (error) throw new Error(error.message);
    console.log(`Removed ${email}.`);
  } else if (cmd === 'list' || !cmd) {
    const { data, error } = await sb.from('admins').select('email, added_at').order('added_at');
    if (error) throw new Error(error.message);
    if (!data.length) console.log('No admins yet. Add one with: npm run admin -- add you@example.com');
    for (const a of data) console.log(`${a.email}  (since ${String(a.added_at).slice(0, 10)})`);
  } else {
    console.log('Usage: npm run admin -- list | add <email> | remove <email>');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
