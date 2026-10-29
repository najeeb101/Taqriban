/* CLI for the daily AI review routine (Docs/REVIEW_BOT.md). Plain Node, no npm install needed.
 * Usage: node scripts/review-bot.mjs context | record <file.json> | fill | email <file.json>
 * Needs REVIEW_BOT_TOKEN. The URL and anon key default to production (both are public, they ship in the web app).
 */
import fs from 'node:fs';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ieehrcxumkibarjsqvbp.supabase.co';
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllZWhyY3h1bWtpYmFyanNxdmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNjY0NTIsImV4cCI6MjEwODg0MjQ1Mn0.A2XhMB_EPenZrhxPreKrbNN4e9MS8DtfSExtq7pR49E';
const TOKEN = process.env.REVIEW_BOT_TOKEN;

async function rpc(fn, args) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: TOKEN, ...args }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

async function main() {
  const [cmd, file] = process.argv.slice(2);
  if (!TOKEN) throw new Error('Missing REVIEW_BOT_TOKEN');

  if (cmd === 'context') {
    console.log(JSON.stringify(await rpc('bot_context', {}), null, 2));
  } else if (cmd === 'record' && file) {
    // { "id": 12, "verdict": "approve|reject|unsure", "reason": "...", "question": { ...pool fields } }
    const r = readJson(file);
    console.log(JSON.stringify(await rpc('bot_record_review', {
      p_id: r.id, p_verdict: r.verdict, p_reason: r.reason, p_question: r.question ?? null,
    })));
  } else if (cmd === 'fill') {
    console.log(JSON.stringify(await rpc('bot_fill_schedule', {})));
  } else if (cmd === 'email' && file) {
    // { "subject": "...", "html": "<p>...</p>" }
    const r = readJson(file);
    await rpc('bot_email_admins', { p_subject: r.subject, p_html: r.html });
    console.log('sent');
  } else {
    console.log('Usage: node scripts/review-bot.mjs context | record <file.json> | fill | email <file.json>');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
