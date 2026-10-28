# Technical Docs — Arabic Daily Estimation Game («تقريباً»)

Companion to `kickoff.md`. This file is the **how**: stack, schema, API, scoring and parsing code, RTL guide, and the question-authoring guide.

> Code here is a starting point, not tested production code. Run the unit tests in §14 before trusting any of it.

---

## 1. Stack (recommended)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript** | You already know React/JS; SSR gives fast first paint on phones |
| Styling | **Tailwind CSS** with logical utilities | `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start` make RTL natural |
| Backend / DB | **Supabase (Postgres + Auth + RPC)** | Anonymous sign-in, row-level security, SQL for percentiles |
| Charts | Hand-rolled SVG (or a light lib) | Log-scale histogram is simple; SVG lets us control RTL |
| Hosting | **Vercel** (app) + Supabase (DB) | Free tiers cover a university launch |
| Analytics | Plausible or PostHog | Privacy-friendly retention tracking |
| Share image | Client-side `html-to-image` first; headless browser later | Server-side tools can mishandle Arabic shaping (see §10) |

You can swap Supabase for any Postgres + your own API; the SQL below is plain Postgres except the RLS/auth parts.

---

## 2. Repo structure

```
/app
  /(game)
    page.tsx                  # Home
    play/[puzzleNo]/page.tsx  # Question flow (Q1..Q3 + reveal + results)
    archive/page.tsx
    leaderboard/page.tsx
    groups/[code]/page.tsx
    profile/page.tsx
    submit/page.tsx
  /api                        # Only if you don't call Supabase RPC directly
/components
  QuestionCard.tsx  GuessInput.tsx  Calculator.tsx
  RevealCard.tsx    LogHistogram.tsx  ResultsCard.tsx
  ShareButtons.tsx  Countdown.tsx     DigitToggle.tsx
/lib
  scoring.ts   parseGuess.ts   format.ts   share.ts   puzzleClock.ts
  supabase.ts
/i18n
  ar.ts                       # all UI strings (so English can be added later)
/styles
  globals.css                 # tokens, fonts, RTL base
/supabase
  migrations/*.sql
  seed/questions/*.md         # authored questions (see §12)
/scripts
  import-questions.ts         # markdown → DB
```

Put **every** user-facing string in `/i18n/ar.ts` from day one, never hard-code Arabic in components. It keeps copy edits cheap and makes a future English UI possible.

---

## 3. Game state machine

```
HOME ──play──▶ Q(i) INPUT ──lock──▶ Q(i) REVEAL ──next──▶ Q(i+1) INPUT
                                        │
                                  (i == 3) ──▶ RESULTS ──▶ SHARE / LEADERBOARD
```

Rules:
- State is derived from the **server** (which questions the player already guessed), not only from localStorage. On load, call `get_today()` which returns the 3 questions (no answers) plus the player's existing guesses/reveals. That gives resume-after-refresh for free.
- A locked guess is immutable (unique constraint, §4).
- If the puzzle date rolls over mid-session (midnight Asia/Qatar), finish the current puzzle if already started; show the new puzzle on next load. Decide and document one behavior; proposed: **let them finish** the puzzle they started that day.

---

## 4. Database schema (Postgres / Supabase)

```sql
-- Players: every user (including guests) has an auth.uid() via Supabase anonymous sign-in.
create table players (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'لاعب',
  university    text,
  digit_style   text not null default 'latn' check (digit_style in ('latn','arab')),
  created_at    timestamptz not null default now()
);

create table puzzles (
  id            serial primary key,
  number        int not null unique,            -- public puzzle number (e.g. 12)
  publish_date  date not null unique,           -- day in Asia/Qatar
  status        text not null default 'scheduled' check (status in ('draft','scheduled','live','archived'))
);

create table questions (
  id            serial primary key,
  puzzle_id     int not null references puzzles(id) on delete cascade,
  position      smallint not null check (position between 1 and 3),
  text_ar       text not null,                  -- the question
  unit_ar       text not null,                  -- shown next to the input, e.g. 'تمرة'
  category      text,
  region        text,                           -- 'universal' | 'gulf' | 'levant' | 'egypt' | 'maghreb' | 'campus'
  difficulty    smallint check (difficulty between 1 and 5),
  unique (puzzle_id, position)
);

-- Answers live in a SEPARATE table so they can be locked down by RLS.
create table question_answers (
  question_id    int primary key references questions(id) on delete cascade,
  answer         numeric not null check (answer > 0),
  as_of          text,                          -- e.g. '2025'
  source_url     text not null,
  explanation_ar text not null                  -- napkin-math steps, Markdown
);

create table guesses (
  id          bigserial primary key,
  player_id   uuid not null references players(id) on delete cascade,
  question_id int  not null references questions(id) on delete cascade,
  guess       numeric not null check (guess > 0),
  multiple    numeric not null check (multiple >= 1),
  direction   text not null check (direction in ('low','high','exact')),
  is_daily    boolean not null,                 -- false when played from the archive
  created_at  timestamptz not null default now(),
  unique (player_id, question_id)               -- one guess per question, immutable
);
create index on guesses (question_id, multiple);

create table daily_results (
  player_id    uuid not null references players(id) on delete cascade,
  puzzle_id    int  not null references puzzles(id) on delete cascade,
  score        numeric not null check (score >= 1),   -- geometric mean of 3 multiples
  is_daily     boolean not null,
  completed_at timestamptz not null default now(),
  primary key (player_id, puzzle_id)
);
create index on daily_results (puzzle_id, score, completed_at) where is_daily;

-- Pre-aggregated histogram so the reveal page doesn't scan all guesses.
create table question_histogram (
  question_id int not null references questions(id) on delete cascade,
  bin         smallint not null,                -- floor(log10(guess/answer) * 4), clamped to [-12, 12]
  count       int not null default 0,
  primary key (question_id, bin)
);

create table groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null default 'friends' check (kind in ('friends','class','club','university')),
  join_code  text not null unique,              -- short, e.g. 6 chars, no ambiguous characters
  owner_id   uuid not null references players(id),
  created_at timestamptz not null default now()
);
create table group_members (
  group_id  uuid not null references groups(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);

create table submissions (
  id          bigserial primary key,
  player_id   uuid references players(id) on delete set null,
  text_ar     text not null,
  unit_ar     text,
  proposed_answer numeric,
  source_url  text,
  napkin_ar   text,
  credit_name text,
  status      text not null default 'new' check (status in ('new','reviewing','accepted','rejected','scheduled')),
  created_at  timestamptz not null default now()
);
```

### Row-level security (essentials)

```sql
alter table players          enable row level security;
alter table guesses          enable row level security;
alter table daily_results    enable row level security;
alter table question_answers enable row level security;
alter table questions        enable row level security;
alter table groups           enable row level security;
alter table group_members    enable row level security;

-- Players: everyone can read display_name/university (for leaderboards); only you can edit yourself.
create policy players_read  on players for select using (true);
create policy players_write on players for update using (id = auth.uid());

-- Guesses: you only see your own raw guesses. Aggregates go through RPCs.
create policy guesses_own on guesses for select using (player_id = auth.uid());
-- No direct insert policy: guesses are created ONLY by submit_guess() (security definer).

-- Questions: readable for live/archived puzzles only (never drafts/scheduled in the future).
create policy questions_read on questions for select using (
  exists (select 1 from puzzles p where p.id = questions.puzzle_id
          and p.publish_date <= (now() at time zone 'Asia/Qatar')::date)
);

-- Answers: visible ONLY after YOU have guessed that question.
create policy answers_after_guess on question_answers for select using (
  exists (select 1 from guesses g where g.question_id = question_answers.question_id
          and g.player_id = auth.uid())
);

-- Groups: members can see their groups; membership via RPC only.
create policy groups_member_read on groups for select using (
  exists (select 1 from group_members m where m.group_id = groups.id and m.player_id = auth.uid())
);
create policy gm_read on group_members for select using (
  exists (select 1 from group_members m where m.group_id = group_members.group_id and m.player_id = auth.uid())
);
```

> Careful with recursive policies on `group_members`; if Postgres complains, move the membership check into a `security definer` helper function `is_group_member(group_id)`.

---

## 5. Scoring (TypeScript, shared by server tests and client display)

```ts
// lib/scoring.ts
export type Direction = 'low' | 'high' | 'exact';

export function multiple(guess: number, answer: number): number {
  if (!(guess > 0) || !(answer > 0)) throw new Error('guess and answer must be > 0');
  return Math.max(guess / answer, answer / guess); // >= 1
}

export function direction(guess: number, answer: number): Direction {
  if (guess === answer) return 'exact';
  return guess < answer ? 'low' : 'high';
}

// Geometric mean of the per-question multiples
export function dailyScore(multiples: number[]): number {
  if (multiples.length === 0) throw new Error('no multiples');
  const meanLog = multiples.reduce((s, m) => s + Math.log(m), 0) / multiples.length;
  return Math.exp(meanLog);
}

export type Tier = 'sniper' | 'great' | 'close' | 'practice' | 'dark';
export function tier(score: number): Tier {
  if (score <= 1.25) return 'sniper';
  if (score <= 2) return 'great';
  if (score <= 5) return 'close';
  if (score <= 20) return 'practice';
  return 'dark';
}

export function histogramBin(guess: number, answer: number): number {
  const raw = Math.floor(Math.log10(guess / answer) * 4);
  return Math.max(-12, Math.min(12, raw)); // clamp to ±3 decades
}
```

**Sanity check against Fermi's own example** (from `kickoff.md` §3.4): multiples `1.45, 2.18, 2.30` → `dailyScore ≈ 1.94`. This must be a unit test.

### Server-side RPC: `submit_guess`

Runs as `security definer` so the client never sees the answer before locking.

```sql
create or replace function submit_guess(p_question_id int, p_guess numeric)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := auth.uid();
  v_answer numeric;
  v_puzzle int;
  v_pub date;
  v_today date := (now() at time zone 'Asia/Qatar')::date;
  v_mult numeric;
  v_dir text;
  v_daily boolean;
  v_bin int;
  v_done int;
  v_score numeric;
  v_better numeric; v_total numeric;
begin
  if v_player is null then raise exception 'not authenticated'; end if;
  if p_guess is null or p_guess <= 0 then raise exception 'invalid guess'; end if;

  select qa.answer, q.puzzle_id, p.publish_date
    into v_answer, v_puzzle, v_pub
  from questions q
  join question_answers qa on qa.question_id = q.id
  join puzzles p on p.id = q.puzzle_id
  where q.id = p_question_id;

  if v_answer is null then raise exception 'unknown question'; end if;
  if v_pub > v_today then raise exception 'puzzle not live'; end if;

  v_daily := (v_pub = v_today);
  v_mult  := greatest(p_guess / v_answer, v_answer / p_guess);
  v_dir   := case when p_guess = v_answer then 'exact' when p_guess < v_answer then 'low' else 'high' end;
  v_bin   := greatest(-12, least(12, floor(log(p_guess / v_answer) * 4)::int));  -- log() is base-10 in Postgres

  insert into guesses(player_id, question_id, guess, multiple, direction, is_daily)
  values (v_player, p_question_id, p_guess, v_mult, v_dir, v_daily);   -- unique violation = already guessed

  insert into question_histogram(question_id, bin, count) values (p_question_id, v_bin, 1)
  on conflict (question_id, bin) do update set count = question_histogram.count + 1;

  -- If all questions of this puzzle are now guessed by the player, write the daily result.
  select count(*) into v_done from guesses g join questions q on q.id = g.question_id
   where g.player_id = v_player and q.puzzle_id = v_puzzle;
  if v_done = (select count(*) from questions where puzzle_id = v_puzzle) then
    select exp(avg(ln(g.multiple))) into v_score
      from guesses g join questions q on q.id = g.question_id
     where g.player_id = v_player and q.puzzle_id = v_puzzle;
    insert into daily_results(player_id, puzzle_id, score, is_daily)
    values (v_player, v_puzzle, v_score, v_daily)
    on conflict do nothing;
  end if;

  -- Per-question percentile: % of OTHER players with a larger multiple.
  select count(*) filter (where multiple > v_mult), count(*)
    into v_better, v_total
  from guesses where question_id = p_question_id and player_id <> v_player;

  return jsonb_build_object(
    'answer',      v_answer,
    'multiple',    v_mult,
    'direction',   v_dir,
    'explanation', (select explanation_ar from question_answers where question_id = p_question_id),
    'source_url',  (select source_url    from question_answers where question_id = p_question_id),
    'closer_than_pct', case when v_total >= 20 then round(100 * v_better / v_total) else null end,
    'players',     v_total + 1,
    'daily_score', v_score          -- non-null only when the puzzle was just completed
  );
end $$;
```

Notes:
- The `unique (player_id, question_id)` constraint is the **one-guess-only** enforcement; catch the unique violation and return the existing reveal instead of an error.
- Percentile via `count(*) filter` is fine at university scale. If it grows, cache per-question counts or use the histogram bins to estimate.

---

## 6. Parsing the guess input (Arabic digits and number words)

Players will type `1,245`, `١٢٤٥`, `1245`, `5 مليون`, `2.5 مليار`, `١٫٥ مليون`, `3k`. Normalize before sending to the server (the server must still validate it is a positive number).

```ts
// lib/parseGuess.ts
const EASTERN = '٠١٢٣٤٥٦٧٨٩';   // Arabic-Indic
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';   // Persian digits (often typed by mistake)

const SCALES: Record<string, number> = {
  'ألف': 1e3, 'الف': 1e3, 'آلاف': 1e3,
  'مليون': 1e6, 'ملايين': 1e6,
  'مليار': 1e9, 'بليون': 1e9, 'مليارات': 1e9,
  'تريليون': 1e12,
  'k': 1e3, 'm': 1e6, 'b': 1e9,
};

export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, d => String(EASTERN.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(PERSIAN.indexOf(d)))
    .replace(/٫/g, '.')              // Arabic decimal separator → dot
    .replace(/[٬,،\s_]/g, '');       // thousands separators and spaces → removed
}

export function parseGuess(raw: string): number | null {
  const s = normalizeDigits(raw.trim().toLowerCase());
  const m = s.match(/^(\d+(?:\.\d+)?)(\p{L}+)?$/u);
  if (!m) return null;
  const base = parseFloat(m[1]);
  const scale = m[2] ? SCALES[m[2]] : 1;
  if (scale === undefined) return null;
  const n = base * scale;
  return Number.isFinite(n) && n > 0 ? n : null;
}
```

UX details:
- Show a **live preview** under the input of how we understood it («سيتم تسجيل: 5,000,000») so "5 مليون" never surprises anyone.
- `inputMode="decimal"` (mobile numeric keypad). Because Arabic keyboards may not show a comma/period, the free-text field plus parser above is friendlier than `type="number"`.
- Ambiguity: a lone comma is treated as a **thousands separator**, never a decimal. Say so in the "how to play" help.

---

## 7. RTL and Arabic UI guide

### 7.1 Document setup
```html
<html lang="ar" dir="rtl">
```
Set it once at the root (Next.js `app/layout.tsx`). Don't flip direction per component unless needed (numbers, see 7.3).

### 7.2 CSS rules
- Use **logical properties**: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`. In Tailwind: `ms-4`, `me-2`, `ps-3`, `pe-3`, `start-0`, `end-0`, `text-start`, `rounded-s-lg`.
- **Never** use `left`/`right`, `ml-*`/`mr-*`, `text-left` for layout.
- Mirror direction-implying icons: `rtl:-scale-x-100` (arrows, chevrons, "next").
- Don't mirror: logos, play/media icons, numerals, clocks, checkmarks, the calculator keypad layout.
- Typography: `line-height: 1.7` for body, `1.3–1.4` for large headings (Arabic glyphs have tall ascenders/descenders); **`letter-spacing: 0`** (tracking breaks letter joining); no italics (use weight/colour for emphasis); avoid `text-transform` (no case in Arabic).

### 7.3 Numbers and mixed-direction text (the #1 source of bugs)
Arabic sentences containing Latin digits/symbols can reorder visually (e.g. `1.45×` or `62%`). Isolate them:

```tsx
export const Num = ({ children }: { children: React.ReactNode }) => (
  <bdi dir="ltr" style={{ unicodeBidi: 'isolate' }}>{children}</bdi>
);
// Usage:  <p>أقل من الإجابة بـ <Num>1.45×</Num></p>
```
- Numeric **input**: `dir="ltr"`, `text-align: end` (so it aligns to the right in an RTL layout while digits still type left-to-right), `inputMode="decimal"`, `autoComplete="off"`.
- The unit label (e.g. «تمرة») sits on the **inline-end** side of the input in RTL, so the reading order is: number → unit.

### 7.4 Digits and formatting
```ts
// lib/format.ts
export function formatNumber(n: number, style: 'latn' | 'arab' = 'latn') {
  const locale = style === 'arab' ? 'ar-EG-u-nu-arab' : 'ar-QA-u-nu-latn';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}
export function formatMultiple(m: number, style: 'latn' | 'arab' = 'latn') {
  if (m >= 1000) return `+${formatNumber(1000, style)}×`;
  const digits = m < 10 ? 2 : m < 100 ? 1 : 0;
  return `${new Intl.NumberFormat(style === 'arab' ? 'ar-EG-u-nu-arab' : 'en-u-nu-latn',
    { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(m)}×`;
}
// Compact big numbers for chart axes: 1.8K, 18K → «1.8 ألف», «18 ألف», «2 مليون»
export function compactArabic(n: number, style: 'latn' | 'arab' = 'latn') {
  const units: [number, string][] = [[1e12,'تريليون'],[1e9,'مليار'],[1e6,'مليون'],[1e3,'ألف']];
  for (const [v, w] of units) if (n >= v) return `${formatNumber(n / v, style)} ${w}`;
  return formatNumber(n, style);
}
```
Default to **Western digits** (clearer for very large numbers and what most Gulf UIs use), with a toggle in settings for Arabic-Indic. Verify the `ar-QA-u-nu-latn` locale on your target browsers; if a browser lacks it, fall back to `'en-u-nu-latn'`.

### 7.5 Fonts
- UI: **IBM Plex Sans Arabic** (clean, good numerals) or **Cairo** / **Tajawal**.
- Display/logo: a character face such as **Reem Kufi** or **Aref Ruqaa** (use sparingly).
- Load with `next/font` (self-hosted, no layout shift), subset `arabic` + `latin`, and a fallback `system-ui`.
- Test the heaviest weight you use; some Arabic fonts get cramped.

### 7.6 The log-scale histogram in RTL
- Bin = `floor(log10(guess/answer) × 4)`, answer at the centre.
- **Proposed:** keep the number line **low → high, left → right** even in an RTL UI (numbers/charts are usually kept LTR in Arabic products), label ends «أقل» and «أكثر», and mark your guess and the answer. Wrap the SVG in `dir="ltr"`. Confirm with 3–5 Arabic-speaking users; flip if they find it confusing (single CSS/SVG transform).
- Add an accessible text summary under the chart (e.g. «خمّنت أقل من الإجابة بـ 1.45× وكان 62% من اللاعبين أبعد منك»).

### 7.7 Accessibility
- Colour is never the only signal: always pair tier colours with an arrow/word.
- Sufficient contrast in both themes; focus rings; respect `prefers-reduced-motion`.
- `aria-live="polite"` on the reveal result; label the input with the question text.

---

## 8. Puzzle clock and countdown

```ts
// lib/puzzleClock.ts
export const TZ = 'Asia/Qatar'; // UTC+3, no DST

export function todayInQatar(now = new Date()): string {
  // 'sv-SE' gives YYYY-MM-DD
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(now);
}

export function msUntilNextPuzzle(now = new Date()): number {
  const [y, m, d] = todayInQatar(now).split('-').map(Number);
  // Next midnight in UTC+3 == 21:00 UTC of the current Qatar date
  const nextMidnightUtc = Date.UTC(y, m - 1, d + 1, -3, 0, 0);
  return nextMidnightUtc - now.getTime();
}
```
Do the "is this puzzle live?" check **on the server** (as in `submit_guess`); the client clock is only for the countdown display.

---

## 9. API surface

If you call Supabase RPCs/queries directly from the client, these are your "endpoints". If you prefer Next.js route handlers, mirror them 1:1.

| Purpose | Call | Notes |
|---|---|---|
| Get today's puzzle + my progress | `rpc('get_today')` | returns 3 questions (no answers), player's guesses/reveals |
| Lock in a guess | `rpc('submit_guess', {question_id, guess})` | §5; returns reveal payload |
| Question histogram | `select * from question_histogram where question_id = :id` | only after player guessed (enforce via RPC `get_histogram`) |
| Daily distribution | `rpc('get_daily_distribution', {puzzle_id})` | log-binned scores |
| Results + rank | `rpc('get_results', {puzzle_id})` | daily score, top %, per-question rows |
| Leaderboard | `rpc('get_leaderboard', {scope, group_id?, university?})` | scope: `day|week|all|university|group` |
| Create group | `rpc('create_group', {name, kind})` | returns join_code |
| Join group | `rpc('join_group', {code})` | |
| Archive list | `select puzzles + my daily_results` | only past puzzles |
| Submit question | `insert into submissions` | rate-limited |
| Update profile | `update players` | name filter server-side |

### Leaderboard logic

- **Today:** `select player, score from daily_results where puzzle_id = :today and is_daily order by score asc, completed_at asc limit 100`.
- **Week / All-time:** geometric mean of `score` over the window: `exp(avg(ln(score)))`, requiring `count(*) >= 3` (week) / `>= 10` (all-time).
- **Group / University:** same queries joined to `group_members` or filtered by `players.university`.
- **Spoiler protection:** a group's "who got what today" is only returned if the caller has completed today's puzzle; otherwise return only the **count** of finishers.
- **Streaks:** compute from `daily_results where is_daily` using the "gaps and islands" trick (`puzzle.publish_date - row_number()`), or maintain a `streak` column updated on completion.

---

## 10. Share text and share image

### 10.1 Text (always works)
```ts
// lib/share.ts
const sq = (m: number) => m <= 1.5 ? '🟩' : m <= 3 ? '🟨' : m <= 10 ? '🟧' : '🟥';
const arrow = (d: 'low'|'high'|'exact') => d === 'low' ? '⬇️' : d === 'high' ? '⬆️' : '🎯';

export function shareText(opts: {
  puzzleNo: number; score: number; topPct?: number | null;
  rows: { multiple: number; direction: 'low'|'high'|'exact' }[]; url: string; digits?: 'latn'|'arab';
}) {
  const f = (n: number) => formatMultiple(n, opts.digits);
  const head = `تقريباً #${opts.puzzleNo} 🎯`;
  const line = `النتيجة: ${f(opts.score)}` + (opts.topPct != null ? ` · أفضل من ${100 - opts.topPct}% من اللاعبين` : '');
  const rows = opts.rows.map(r => `${sq(r.multiple)} ${arrow(r.direction)} ${f(r.multiple)}`).join('\n');
  return `${head}\n${line}\n${rows}\n${opts.url}`;
}
```
- **No answers and no question text** in the share (spoilers).
- Mixed RTL/emoji lines can render oddly in some apps; prefix the whole text with a Right-to-Left Mark (`\u200F`) per line if you see reordering.

### 10.2 Image card
- Start **client-side** with `html-to-image` rendering a hidden RTL `<div>` styled with your fonts. This uses the browser's text shaping, so Arabic is correct.
- If you later want server-rendered OG images, **test Arabic first**: Satori-based generators have had limited RTL/shaping support. Alternatives: render HTML in a headless Chromium (Playwright) and screenshot it, or pre-render on the client and upload.
- Card content: puzzle number, big score, tier title, three squares with arrows, small logo/URL. Keep it 1080×1350 (portrait, works on stories/feeds).

---

## 11. Calculator component

- Keys: `0–9`, `. + − × ÷`, `( )`, `C`, `⌫`, `=`; and **«استخدم النتيجة»** which fills the guess input with the result.
- Evaluate expressions with a small **safe parser** (shunting-yard) — **never `eval`**.
- Keypad layout stays **LTR** (standard calculator layout), only the surrounding labels are RTL.
- Display follows the player's digit style; accept both digit styles when typing from a physical keyboard.
- Bottom-sheet drawer on mobile so the question stays visible.

---

## 12. Question authoring guide

### 12.1 Template (`/supabase/seed/questions/<date>-q<n>.md`)
```md
---
publish_date: 2026-11-05        # Asia/Qatar day
position: 2                     # 1 easy, 2 medium, 3 hard
category: aviation              # free text
region: gulf                    # universal | gulf | levant | egypt | maghreb | campus
difficulty: 3                   # 1-5, estimate before launch, recalibrate with data
unit_ar: راكب
answer: 0                       # fill with the verified value (> 0)
as_of: "2025"
source_url: https://...         # primary source
---
## السؤال
كم عدد ... ؟

## الحساب على الورقة
1. نبدأ بـ ...
2. نضرب في ...
3. النتيجة التقريبية ...

## ملاحظات للمحرر
- لماذا السؤال جيد؟ ما الخطأ الشائع؟
```
A script (`scripts/import-questions.ts`) parses the front-matter + sections and upserts into `puzzles`, `questions`, `question_answers`.

### 12.2 Checklist before a question is scheduled
- [ ] Answer is a single **positive** number with a clear unit and time frame.
- [ ] `source_url` is a primary or reputable source; `as_of` recorded; number double-checked by a second person.
- [ ] Napkin math exists and is **plausible to do in your head** (3–5 steps), and it lands within ~2× of the true answer when done sensibly.
- [ ] Not a pure trivia fact (no reasoning path) and not trivially guessable.
- [ ] Culturally neutral/respectful; no political or religious controversy.
- [ ] Arabic reviewed for clarity (MSA), no ambiguity about what's being counted ("per year" vs "total", "in Qatar" vs "in the Gulf").
- [ ] Difficulty fits its position (Q1 easy → Q3 hard).

### 12.3 Calibration loop
After each puzzle, compute the median multiple per question; if Q1's median is >5× or Q3's is <2×, adjust the difficulty ratings and your next picks.

---

## 13. Anti-abuse and moderation

- **One guess per question** enforced by DB unique constraint; answers gated by RLS until a guess exists.
- **Honor system** for Googling (documented in "how to play"). Don't try to detect it.
- **Rate limit** guess/submission/group-join endpoints (Supabase edge function or a simple per-IP limiter).
- **Display names:** length 2–24, strip control/bidi override characters (`\u202A–\u202E`, `\u2066–\u2069`) to prevent spoofing, and apply an Arabic + English profanity list; allow reporting.
- **Group codes:** unambiguous charset (no `0/O/1/I`), 6+ chars, regenerate-able by owner.
- **Submissions:** moderation queue, never auto-published; strip links except `source_url`; credit only with consent.
- **Privacy:** no real names required, no email unless the player links an account; provide "delete my data" (cascades via `on delete cascade`).
- **Archive spoilers:** archived puzzles are only revealed after you guess each question (same RLS rule).

---

## 14. Testing

Unit tests (Vitest/Jest) — write these first:
1. `multiple(1245, 1800) ≈ 1.446`; `multiple(3600, 1800) = 2`; `multiple(900, 1800) = 2` (symmetry).
2. `dailyScore([1.45, 2.18, 2.30]) ≈ 1.94`.
3. `parseGuess`: `'1,245'→1245`, `'١٢٤٥'→1245`, `'5 مليون'→5_000_000`, `'٢٫٥ مليار'→2_500_000_000`, `'0'→null`, `'-3'→null`, `'abc'→null`, `'3k'→3000`.
4. `histogramBin` is centred (guess = answer → bin 0) and symmetric around 0.
5. `msUntilNextPuzzle` at 23:59:59 Qatar time ≈ 1000 ms; at 00:00:00 ≈ 86,400,000 ms.

Integration/manual:
- Two guesses on the same question → second returns the existing reveal, not a new row.
- Anonymous user cannot `select` from `question_answers` before guessing.
- Percentile hidden when fewer than 20 players.
- Resume mid-puzzle after a hard refresh.
- **Real-device RTL pass** on Android Chrome and iOS Safari: input alignment, mixed numbers, share text in WhatsApp, calculator, charts.

---

## 15. Deployment and ops

1. Create Supabase project; run migrations; enable **Anonymous sign-ins** and (later) email/Google auth.
2. Set env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only service key for the import script.
3. Seed questions; mark the first puzzle `live` for today's Qatar date.
4. A **daily cron** (Supabase scheduled function or Vercel Cron) flips `scheduled → live → archived` and alerts you if the backlog is below 7 days.
5. Add the web manifest and icons for PWA install; cache the app shell only (guesses need the network).
6. Backups: enable Supabase point-in-time or daily dumps once you have real users.

---

## 16. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, for importing questions
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_ANALYTICS_ID=
```

---

## 17. Glossary

- **Fermi estimation:** answering a hard-to-know number by breaking it into smaller guessable pieces and multiplying.
- **Multiple:** how many times off your guess was, `max(guess/answer, answer/guess)`; 1× is perfect.
- **Geometric mean:** the n-th root of the product; the right average for ratios.
- **Napkin math:** the worked estimation shown after each reveal.
- **Puzzle day:** the 00:00–24:00 window in Asia/Qatar (UTC+3).
- **Bidi isolate:** wrapping LTR text (numbers) in an element so it does not get reordered inside RTL text.
