/* Calibration report. Usage: npm run stats */
import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may already be set */
}

interface Row {
  puzzle_number: number;
  position: number;
  players: number;
  median_multiple: number | null;
  pct_low: number | null;
  pct_high: number | null;
  text_ar: string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc('admin_stats');
  if (error) throw new Error(error.message);
  const { questions, new_submissions } = data as { questions: Row[]; new_submissions: number };

  const f = (n: number | null, d = 1) => (n === null || n === undefined ? '-' : n.toFixed(d));
  console.log('Puzzle Pos Players Median×  Low%  High%  Flags');
  for (const r of questions) {
    const flags: string[] = [];
    if (r.players >= 20 && r.median_multiple !== null) {
      if (r.position === 1 && r.median_multiple > 5) flags.push('Q1 too hard (median > 5x)');
      if (r.position === 3 && r.median_multiple < 2) flags.push('Q3 too easy (median < 2x)');
    }
    console.log(
      `${String(r.puzzle_number).padStart(6)} ${String(r.position).padStart(3)} ${String(r.players).padStart(7)} ` +
        `${f(r.median_multiple, 2).padStart(7)} ${f(r.pct_low, 0).padStart(5)} ${f(r.pct_high, 0).padStart(6)}  ${flags.join('; ')}`,
    );
  }
  console.log(`\nSubmissions with status 'new': ${new_submissions}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
