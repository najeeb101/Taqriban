/* Imports content/questions/*.md into Supabase (service role). Safe to re-run; never deletes guesses.
 * Usage: npm run import -- [--start YYYY-MM-DD] [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may already be set */
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const startIdx = args.indexOf('--start');
const startArg = startIdx >= 0 ? args[startIdx + 1] : undefined;

function qatarToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date());
}
function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const start = startArg ?? qatarToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
  console.error('--start must be YYYY-MM-DD');
  process.exit(1);
}

interface Q {
  file: string;
  puzzle: number;
  position: number;
  text: string;
  unit: string;
  category: string | null;
  region: string | null;
  difficulty: number | null;
  answer: number;
  as_of: string | null;
  source_url: string;
  source_name: string | null;
  explanation: string;
}

function section(body: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'm');
  const m = re.exec(body);
  if (!m) return '';
  const rest = body.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

// Fermi-style barrier (content/README.md "Style"): an answer must be a number a player can build from everyday
// estimates. Past 100 million the figure stops being imaginable and the question turns into stats trivia.
const MAX_ANSWER = 100_000_000;
// Units that usually mean "look up an official statistic" rather than "estimate it". Warning only.
const LOOKUP_UNITS = ['طن', 'تيراواط ساعة', 'حاوية قياسية', 'متر مكعب', 'نسمة'];

const dir = path.join('content', 'questions');
const errors: string[] = [];
const warnings: string[] = [];
const qs: Q[] = [];

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
  const fm = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
  const d = fm.data as Record<string, unknown>;
  const text = section(fm.content, 'السؤال');
  const explanation = section(fm.content, 'الحساب على الورقة');
  const puzzle = Number(d.puzzle);
  const position = Number(d.position);
  const answer = Number(d.answer);
  const unit = typeof d.unit_ar === 'string' ? d.unit_ar.trim() : '';
  const source_url = typeof d.source_url === 'string' ? d.source_url.trim() : '';
  const problems: string[] = [];
  if (!Number.isInteger(puzzle) || puzzle < 1) problems.push('puzzle');
  if (![1, 2, 3].includes(position)) problems.push('position');
  if (!(answer > 0) || !Number.isFinite(answer)) problems.push('answer>0');
  if (!/^https?:\/\//.test(source_url)) problems.push('source_url');
  if (!text) problems.push('## السؤال');
  if (!explanation) problems.push('## الحساب على الورقة');
  if (!unit) problems.push('unit_ar');
  if (problems.length) {
    errors.push(`${file}: invalid/missing ${problems.join(', ')}`);
    continue;
  }
  if (answer > MAX_ANSWER) {
    errors.push(`${file}: answer ${answer.toLocaleString('en')} is over the ${MAX_ANSWER.toLocaleString('en')} limit - rewrite it as a smaller, everyday question`);
    continue;
  }
  if (LOOKUP_UNITS.includes(unit)) warnings.push(`${file}: unit «${unit}» reads like a statistics lookup - prefer an everyday unit`);
  const str = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v));
  qs.push({
    file,
    puzzle,
    position,
    text,
    unit,
    answer,
    source_url,
    explanation,
    category: str(d.category),
    region: str(d.region),
    difficulty: d.difficulty === undefined ? null : Number(d.difficulty),
    as_of: str(d.as_of),
    source_name: str(d.source_name),
  });
}

// Group per puzzle; each must have exactly positions 1..3.
const byPuzzle = new Map<number, Q[]>();
for (const q of qs) byPuzzle.set(q.puzzle, [...(byPuzzle.get(q.puzzle) ?? []), q]);
const valid: [number, Q[]][] = [];
for (const [n, list] of [...byPuzzle.entries()].sort((a, b) => a[0] - b[0])) {
  const pos = list.map((q) => q.position).sort().join(',');
  if (pos !== '1,2,3') {
    errors.push(`puzzle ${n}: needs positions 1,2,3 (found ${pos || 'none'}) - skipped`);
    continue;
  }
  list.sort((a, b) => a.position - b.position);
  valid.push([n, list]);
}

const trunc = (s: string, n = 38) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
console.log(`\nStart date (puzzle 1): ${start}${dryRun ? '   [dry run]' : ''}\n`);
console.log('No.  Date        Q1 | Q2 | Q3');
for (const [n, list] of valid) {
  console.log(`${String(n).padStart(3)}  ${addDays(start, n - 1)}  ${list.map((q) => trunc(q.text)).join(' | ')}`);
}
console.log(`\n${valid.length} puzzle(s) valid, ${errors.length} problem(s).`);
for (const e of errors) console.log(`  ! ${e}`);
for (const w of warnings) console.log(`  ~ ${w}`);

async function main() {
  if (dryRun) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const check = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data;
  };

  // Phase 1: ensure puzzles exist; move re-dated ones out of the way first (publish_date is unique).
  const numbers = valid.map(([n]) => n);
  const existing = check(
    await sb.from('puzzles').select('id,number,publish_date,status').in('number', numbers),
    'select puzzles',
  );
  const byNum = new Map<number, { id: number; publish_date: string }>(
    existing!.map((p) => [p.number as number, { id: p.id as number, publish_date: p.publish_date as string }]),
  );
  for (const [n] of valid) {
    const p = byNum.get(n);
    if (p && p.publish_date !== addDays(start, n - 1)) {
      check(
        await sb.from('puzzles').update({ publish_date: addDays('1900-01-01', p.id) }).eq('id', p.id),
        'park puzzle date',
      );
    }
  }
  for (const [n] of valid) {
    const date = addDays(start, n - 1);
    const p = byNum.get(n);
    if (p) {
      check(await sb.from('puzzles').update({ publish_date: date }).eq('id', p.id), 'update puzzle');
    } else {
      const row = check(
        await sb.from('puzzles').insert({ number: n, publish_date: date, status: 'scheduled' }).select('id').single(),
        'insert puzzle',
      );
      byNum.set(n, { id: row!.id as number, publish_date: date });
    }
  }
  // Phase 2: questions + answers.
  for (const [n, list] of valid) {
    const puzzle_id = byNum.get(n)!.id;
    const rows = list.map((q) => ({
      puzzle_id,
      position: q.position,
      text_ar: q.text,
      unit_ar: q.unit,
      category: q.category,
      region: q.region,
      difficulty: q.difficulty,
    }));
    const saved = check(
      await sb.from('questions').upsert(rows, { onConflict: 'puzzle_id,position' }).select('id,position'),
      'upsert questions',
    );
    const idByPos = new Map(saved!.map((r) => [r.position as number, r.id as number]));
    const ans = list.map((q) => ({
      question_id: idByPos.get(q.position)!,
      answer: q.answer,
      as_of: q.as_of,
      source_url: q.source_url,
      source_name: q.source_name,
      explanation_ar: q.explanation,
    }));
    check(await sb.from('question_answers').upsert(ans, { onConflict: 'question_id' }), 'upsert answers');
  }
  console.log('Imported.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
