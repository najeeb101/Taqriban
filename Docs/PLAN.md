# Build Plan — «تقريباً» (Taqriban) v1

> Written 2026-10-28. Goal: ship the whole v1 from `kickoff_1.md` + `docs.md` today.
> **Every implementing agent reads this file first, then `Docs/kickoff_1.md` and `Docs/docs.md`.**
> This file overrides the docs where they disagree (deviations are listed in §2).

---

## 1. Scope (v1 = all of kickoff phases 1–3)

Game flow (home → Q1..Q3 input → reveal → results), number parser, built-in calculator,
server-side scoring with answers hidden until a guess is locked, anonymous identity + resume,
per-question percentile + daily Top %, log-scale charts, copy-text share + share-card image,
display name + university, leaderboards (day / week / all-time / streak, filterable by
university or group), private groups with invite codes and spoiler protection, streaks,
profile/stats, archive, question submissions (moderation queue), settings (digits, theme,
reduce motion, optional email account, delete my data), PWA (manifest, icons, app-shell SW),
optional privacy-friendly analytics hook, calibration stats script, 30 sourced questions.

**Out of scope:** Google sign-in, native apps, English UI, admin web UI (moderation happens in
Supabase Table Editor; calibration via `npm run stats`), streak freezes.

## 2. Decisions (open questions from kickoff §12 resolved with the proposed defaults)

| Topic | Decision |
|---|---|
| Name | «تقريباً» (repo: Taqriban). Logo text «تقريباً». |
| Default digits | Western `0-9`; toggle to Arabic-Indic in settings. |
| Histogram axis | Low → high, **left → right**, chart wrapped in `dir="ltr"`, ends labelled «أقل» / «أكثر». |
| Archive plays | Count for personal stats; **not** for streaks or leaderboards. |
| Day rollover | A player who started a puzzle on its day may finish it the next day and it still counts as daily (see §5.3). |
| Week board | Rolling window: puzzles with `publish_date` in `[today-6, today]`, min 3 days. All-time min 10 days. |
| Share squares | Use the **tier thresholds** (kickoff §4.5) for both the daily tier and per-question squares: ≤1.25 & ≤2 🟩, ≤5 🟨, ≤20 🟧, >20 🟥. (docs.md §10 used different thresholds; ignore those.) |
| Histogram bins | **Deviation:** `bin = roundHalfAwayFromZero(log10(guess/answer) * 4)`, clamped to `[-12, 12]`. This is truly centred (bin 0 = within ±1.33×) and symmetric: `bin(r) === -bin(1/r)`. SQL: `round((log(r) * 4)::numeric)::int` (numeric round is half-away-from-zero). Daily-score bins: same formula on `score`, clamped `[0, 12]`. |
| Backend access | **All** client data access goes through `security definer` RPCs. RLS is enabled on every table with **no** select/insert/update policies for `anon`/`authenticated` (so direct table access is denied). This avoids the recursive group policies from docs §4. |
| Auth | Supabase anonymous sign-in on first visit. Optional email (magic link) to make the account permanent / sign in on another device. No Google. |
| Content location | **Deviation:** questions live in `content/questions/pNNN-qP.md` (not `supabase/seed/questions`). Front-matter has `puzzle` (number) instead of `publish_date`; the import script maps puzzle N → `START_DATE + (N-1)` days. |
| Puzzle status | No cron. A puzzle is live when `status <> 'draft'` and `publish_date <= qatar_today()`. |
| i18n | Strings split in `i18n/ar/{common,game,social}.ts`, merged by `i18n/ar/index.ts`. No Arabic string literals in components. |
| Package manager | npm. Node 22. |

## 3. Stack

Next.js (latest, App Router, TypeScript, Turbopack) · Tailwind CSS v4 (logical utilities, `rtl:` variant) ·
`@supabase/supabase-js` (browser client, session in localStorage) · local Supabase via the `supabase` CLI
(devDependency) + Docker · Vitest (unit + integration) · Playwright (e2e smoke) · `html-to-image` (share card) ·
`react-markdown` (napkin-math explanations; no raw HTML) · `gray-matter` + `tsx` (import script) ·
fonts via `next/font/google`: **IBM Plex Sans Arabic** (UI, 400/500/700, subsets arabic+latin) and **Reem Kufi** (logo/display).

> Next.js version note: read `node_modules/next/dist/docs/` if present before writing Next-specific code.
> In recent Next versions route `params` in server components is a Promise; in client components use
> `useParams()`. `next lint` may not exist — run ESLint directly.

## 4. Repository layout and ownership

```
app/                      Next.js routes (see §7)
components/ui/            primitives                      (Agent A)
components/shell/         AppShell, Header, NavDrawer     (Agent A)
components/providers/     Prefs/Player providers          (Agent A)
components/game/          game-flow components            (Agent C1)
components/social/        leaderboard/groups/profile/...  (Agent C2)
lib/                      pure logic + api contract       (Agent A; B may fix api.ts internals only)
i18n/ar/common.ts         shared strings                  (Agent A)
i18n/ar/game.ts           game strings                    (A seeds, C1 owns)
i18n/ar/social.ts         social/meta strings             (A seeds, C2 owns)
supabase/                 config.toml, migrations/        (Agent B)
scripts/                  import-questions.ts, stats.ts   (Agent B)
content/questions/        authored questions              (Content agents Q1, Q2)
tests/unit/               vitest unit tests               (Agent A)
tests/integration/        vitest vs local supabase        (Agent B)
tests/e2e/                Playwright smoke                (Agent D)
public/                   icons, sw.js                    (Agent C2)
README.md                 setup/deploy/content guide      (Agent D)
```

**Rule:** only touch files you own. If you need a change in someone else's file (especially
`lib/types.ts` / `lib/api.ts` signatures), do NOT edit it — append a note to
`Docs/CONTRACT_CHANGES.md` and work around it. The integrator reconciles.

**Rule:** in phase 2, do not run `next dev` or `next build` (parallel agents share `.next/`).
Use `npx tsc --noEmit`, ESLint and `npm test`. Do not add npm dependencies in phase 2 unless
unavoidable; if you must, note it in `Docs/CONTRACT_CHANGES.md`.

## 5. Backend contract (Supabase / Postgres)

### 5.1 Schema
As `docs.md` §4 with these changes:
- `players.display_name` default: `'لاعب ' || (1000 + floor(random()*9000))::int` (set by trigger on `auth.users` insert). Every RPC also does `insert into players(id) values (auth.uid()) on conflict do nothing` as a safety net.
- `puzzles.status` in `('draft','scheduled','live','archived')`, liveness per §2.
- `question_answers` adds `source_name text`.
- `groups.owner_id` references players; ownership is transferred (oldest member) when the owner leaves or deletes their data; group deleted when last member leaves.
- `rate_events(player_id uuid, action text, at timestamptz default now())` + helper `check_rate(action, max, window)` raising `rate_limited`.
- helper `qatar_today()` = `(now() at time zone 'Asia/Qatar')::date`.
- view/func for calibration (`question_stats`: question, players, median multiple, % low/high) — service role only.

### 5.2 RPCs (all `security definer`, `set search_path = public`, `grant execute ... to authenticated`, revoked from `public`/`anon`)

Errors are raised as `raise exception '<code>'` with these exact codes:
`not_authenticated, invalid_guess, unknown_question, puzzle_not_live, not_completed, not_member, not_owner, invalid_name, invalid_input, invalid_code, rate_limited, not_found`.

| RPC | Args | Returns (JSON shape = TS type in `lib/types.ts`) |
|---|---|---|
| `get_puzzle` | `p_number int default null` (null = today's) | `PuzzleState` or `null` (no puzzle / future / draft) |
| `submit_guess` | `p_question_id int, p_guess numeric` | `SubmitGuessResult`. Second call on same question returns the existing reveal with `already_guessed: true`. |
| `get_histogram` | `p_question_id int` | `Histogram` (raise `not_completed` if caller hasn't guessed it) |
| `get_results` | `p_puzzle_id int` | `Results` (raise `not_completed` unless caller finished the puzzle) |
| `get_leaderboard` | `p_scope text, p_group_id uuid default null, p_university text default null` | `Leaderboard` |
| `create_group` | `p_name text, p_kind text` | `GroupSummary` (rate 10/day) |
| `join_group` | `p_code text` | `GroupSummary` (idempotent; rate 30/hour; case-insensitive) |
| `leave_group` | `p_group_id uuid` | `null` |
| `get_my_groups` | — | `GroupSummary[]` |
| `get_group` | `p_code text` | `GroupDetail` or `null` |
| `rename_group` | `p_group_id uuid, p_name text` | `null` (owner) |
| `remove_member` | `p_group_id uuid, p_player_id uuid` | `null` (owner, can't remove self) |
| `regenerate_code` | `p_group_id uuid` | `text` new code (owner) |
| `get_profile` | — | `Profile` |
| `update_profile` | `p_display_name text default null, p_university text default null, p_digit_style text default null` (null = unchanged; `''` university = clear) | `Profile` |
| `get_archive` | — | `ArchiveItem[]` newest first, puzzles with `publish_date <= today` |
| `submit_question` | `p_text, p_unit, p_answer numeric, p_source_url, p_napkin, p_credit_name` | `{ id }` (rate 5/day) |
| `delete_my_data` | — | `null` (transfers group ownership, then `delete from auth.users where id = auth.uid()`) |

### 5.3 Rules the SQL must implement
- `multiple = greatest(g/a, a/g)`; `direction` low/high/exact; daily score = `exp(avg(ln(multiple)))`.
- **is_daily for a guess** = `pub = today` OR (`pub = today - 1` AND the player already has an `is_daily` guess on that puzzle). `daily_results.is_daily` = all of that puzzle's guesses are `is_daily`.
- `closer_than_pct` = `round(100 * (#other guesses on question with multiple > mine) / (#other guesses))`, only when `#other >= 20`, else `null`. `players` = all guesses on the question incl. mine.
- `top_pct` = `ceil(100 * (#daily results for puzzle with score <= mine) / (#daily results))`, only when that total `>= 20`, else `null`. For an archive play, count the caller's score hypothetically (`+1` in both numerator and denominator). `players` = # daily results.
- Distribution in `Results` = histogram of `is_daily` daily scores for the puzzle.
- Leaderboards: `day` = today's puzzle, `is_daily`, order `score asc, completed_at asc`. `week`/`all` = geometric mean of `is_daily` scores, min 3 / 10 days, order score asc then days desc. `streak` = current streak desc (only ≥1). Top 100 + `me`. With `p_group_id`: caller must be a member (`not_member`), **all** members are listed (unqualified ones with `rank: null`, after ranked); for scope `day`, if the caller has not completed today's puzzle → `hidden: true`, `entries: []`, only `finishers` set. With `p_university`: filter `players.university`.
- Streak: consecutive puzzle **numbers** with an `is_daily` result; current streak is alive if its last number is today's or yesterday's puzzle number.
- Display name: strip control + bidi-override chars (`‪-‮`, `⁦-⁩`, `‎‏` allowed? no — strip them too), trim, collapse spaces, length 2–24, small Arabic+English profanity list → `invalid_name`.
- University codes (validated server-side): `qu, hbku, tamuq, cmuq, gu-q, nu-q, wcm-q, vcuarts-q, udst, dohainstitute, lusail, other` (Arabic names in `lib/universities.ts`).
- Group codes: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, unique, stored upper-case.

## 6. Frontend contract

### 6.1 `lib/types.ts` (create verbatim; frozen)

```ts
export type Direction = 'low' | 'high' | 'exact';
export type DigitStyle = 'latn' | 'arab';
export type ThemePref = 'auto' | 'light' | 'dark';
export type Tier = 'sniper' | 'great' | 'close' | 'practice' | 'dark';
export type GroupKind = 'friends' | 'class' | 'club' | 'university';
export type LeaderboardScope = 'day' | 'week' | 'all' | 'streak';

export interface Bin { bin: number; count: number }

export interface QuestionPublic {
  id: number; position: number; text: string; unit: string; category: string | null;
}

export interface Reveal {
  question_id: number; guess: number; answer: number; multiple: number; direction: Direction;
  explanation: string;            // napkin math, Markdown
  source_url: string; source_name: string | null; as_of: string | null;
  closer_than_pct: number | null; // null when < 20 other players
  players: number;                // everyone who answered this question, incl. me
}

export interface SubmitGuessResult extends Reveal {
  daily_score: number | null;     // non-null once the puzzle is complete
  already_guessed: boolean;
}

export interface PuzzleState {
  puzzle_id: number; number: number; publish_date: string; // YYYY-MM-DD (Asia/Qatar)
  is_daily: boolean;              // true if this is today's puzzle
  questions: QuestionPublic[];    // ordered by position, NEVER contains answers
  reveals: Reveal[];              // only for questions the caller already guessed
  daily_score: number | null;     // set when the caller completed the puzzle
}

export interface Histogram { question_id: number; bins: Bin[]; total: number; my_bin: number }

export interface ResultRow {
  question_id: number; position: number; text: string; unit: string;
  guess: number; answer: number; multiple: number; direction: Direction;
}

export interface Results {
  puzzle_id: number; number: number; publish_date: string; is_daily: boolean;
  score: number; top_pct: number | null; players: number;
  rows: ResultRow[]; distribution: Bin[]; my_bin: number;
}

export interface LeaderboardEntry {
  rank: number | null; player_id: string; display_name: string; university: string | null;
  score: number | null; days: number | null; streak: number | null; is_me: boolean;
}
export interface Leaderboard {
  scope: LeaderboardScope; entries: LeaderboardEntry[]; me: LeaderboardEntry | null;
  hidden: boolean; finishers: number;
}

export interface GroupSummary {
  id: string; name: string; kind: GroupKind; join_code: string; members: number; is_owner: boolean;
}
export interface GroupMember {
  player_id: string; display_name: string; university: string | null;
  is_owner: boolean; is_me: boolean; finished_today: boolean;
  today_score: number | null;     // null when hidden or not finished
  streak: number;
}
export interface GroupDetail {
  id: string; name: string; kind: GroupKind;
  join_code: string | null;       // null for non-members
  is_member: boolean; is_owner: boolean; member_count: number;
  members: GroupMember[];         // empty for non-members
  hidden: boolean;                // caller hasn't finished today → scores hidden
  finishers_today: number;
}

export interface Profile {
  id: string; display_name: string; university: string | null; digit_style: DigitStyle;
  games: number; avg_score: number | null; best_score: number | null;
  current_streak: number; best_streak: number; distribution: Bin[];
}

export interface ArchiveItem {
  puzzle_id: number; number: number; publish_date: string; is_today: boolean;
  answered: number; total: number; score: number | null; played_daily: boolean | null;
}

export interface SubmissionInput {
  text: string; unit?: string; proposed_answer?: number | null;
  source_url?: string; napkin?: string; credit_name?: string;
}

export interface AuthState { userId: string; isAnonymous: boolean; email: string | null }
```

### 6.2 `lib/api.ts` (frozen signatures; the ONLY backend entry point for UI code)

```ts
export class ApiError extends Error { code: string }   // code = one of the §5.2 codes or 'network' | 'unknown'
export function getPuzzle(number?: number): Promise<PuzzleState | null>;
export function submitGuess(questionId: number, guess: number): Promise<SubmitGuessResult>;
export function getHistogram(questionId: number): Promise<Histogram>;
export function getResults(puzzleId: number): Promise<Results>;
export function getLeaderboard(scope: LeaderboardScope, opts?: { groupId?: string; university?: string }): Promise<Leaderboard>;
export function createGroup(name: string, kind: GroupKind): Promise<GroupSummary>;
export function joinGroup(code: string): Promise<GroupSummary>;
export function leaveGroup(groupId: string): Promise<void>;
export function getMyGroups(): Promise<GroupSummary[]>;
export function getGroup(code: string): Promise<GroupDetail | null>;
export function renameGroup(groupId: string, name: string): Promise<void>;
export function removeMember(groupId: string, playerId: string): Promise<void>;
export function regenerateCode(groupId: string): Promise<string>;
export function getProfile(): Promise<Profile>;
export function updateProfile(patch: { display_name?: string; university?: string | null; digit_style?: DigitStyle }): Promise<Profile>;
export function getArchive(): Promise<ArchiveItem[]>;
export function submitQuestion(input: SubmissionInput): Promise<{ id: number }>;
export function deleteMyData(): Promise<void>;          // rpc, then signOut + reset session
export function getAuthState(): Promise<AuthState>;
export function linkEmail(email: string): Promise<void>;      // auth.updateUser({ email }, { emailRedirectTo: `${location.origin}/settings` })
export function signInWithEmail(email: string): Promise<void>; // auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/settings`, shouldCreateUser: false } })
export function signOut(): Promise<void>;
```
Every call awaits `ensureSession()` (anonymous sign-in if no session) from `lib/supabase.ts`.
`updateProfile({ university: null })` sends `p_university: ''`.

### 6.3 Pure lib modules (Agent A, with unit tests)

| File | Exports |
|---|---|
| `lib/scoring.ts` | `multiple, direction, dailyScore, tier, TIER_SQUARE: Record<Tier,string>, squareFor(multiple), histogramBin(guess, answer), scoreBin(score), roundHalfAway(x)` |
| `lib/parseGuess.ts` | `normalizeDigits, parseGuess` (docs §6 + uppercase K/M/B, `آلاف`/`الاف`, cap at 1e18) |
| `lib/format.ts` | `formatNumber, formatMultiple, compactArabic, localizeDigits(text, style)` (ASCII digits → ٠-٩ when `arab`), `formatPct, formatDateAr(ymd, style)` («الأربعاء 28 أكتوبر»), `formatCountdown(ms, style)` («05:32:10») |
| `lib/puzzleClock.ts` | `TZ, todayInQatar, msUntilNextPuzzle` |
| `lib/share.ts` | `shareText({ puzzleNo, score, topPct, rows, url, digits })` (tier squares, ⬇️/⬆️/🎯, RLM `‏` at start of each line, no answers/question text) |
| `lib/calc.ts` | `evaluate(expr): number \| null` — shunting-yard; `+ - * / × ÷ − ( )`, decimals, unary minus, Arabic-Indic digits; never `eval` |
| `lib/sanitize.ts` | `sanitizeName(raw): string`, `isValidName(name): boolean` (mirrors server rules, minus profanity) |
| `lib/universities.ts` | `UNIVERSITIES: { code: string; name: string }[]`, `universityName(code)` |
| `lib/i18n.ts` | `t` (the merged strings object) and `fmt(template, vars)` for `{x}` placeholders |
| `lib/analytics.ts` | `track(event, props?)` → `window.plausible?.(...)`; no-op otherwise |

Required unit tests: everything in `docs.md` §14.1 (with the §2 bin deviation: `histogramBin(g,a) === -histogramBin(a,g)` and `histogramBin(a,a) === 0`), plus `calc`, `share` (snapshot of the kickoff example), `format`, `sanitize`.

### 6.4 Design tokens (Agent A puts them in `app/globals.css`; light = paper, dark = chalkboard)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F4EFE6` | `#16201B` |
| `--surface` | `#FBF8F2` | `#1E2B25` |
| `--ink` | `#1F1C17` | `#ECE8DF` |
| `--muted` | `#6E675C` | `#A3ADA6` |
| `--line` | `#DDD5C7` | `#33453D` |
| `--accent` | `#B4441C` | `#F0895A` |
| `--accent-ink` | `#FFFFFF` | `#16201B` |
| `--tier-green` | `#2F9E44` | `#51CF66` |
| `--tier-yellow` | `#C99A06` | `#FCC419` |
| `--tier-orange` | `#E8590C` | `#FF922B` |
| `--tier-red` | `#C92A2A` | `#FF6B6B` |

Theme switching: `data-theme="light|dark"` on `<html>` set by an inline script before paint
(localStorage `theme` = auto/light/dark; auto follows `prefers-color-scheme`). Tailwind v4:
`@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` and expose tokens via `@theme`.
Body line-height 1.7, headings 1.35, `letter-spacing: 0`, no italics. Respect `prefers-reduced-motion`
and the in-app reduce-motion setting (`data-reduce-motion` on `<html>`).
Mobile-first; max content width ~32rem centred; 16px side gutter; tap targets ≥ 44px; visible focus rings.

### 6.5 Shared UI (Agent A)
- `components/ui/`: `Num` (bdi dir=ltr isolate), `Button` (primary/secondary/ghost, sizes, loading), `Card`, `Sheet` (accessible bottom-sheet drawer: focus trap, Esc, backdrop), `Chip`, `Spinner`, `EmptyState`, `ErrorState` (with retry), `Toast` (`useToast()`), `Tabs` (segmented control), `Icon` (inline SVG set: menu, close, calc, share, copy, flame, arrowUp, arrowDown, chevron, target, trophy, users, archive, user, settings, plus, lightbulb, download; direction-implying icons get `rtl:-scale-x-100`), `Markdown` (react-markdown, digits localized).
- `components/providers/`: `PrefsProvider` (`digitStyle`, `setDigitStyle` → localStorage + `updateProfile` best-effort; `theme`, `setTheme`; `reduceMotion`, `setReduceMotion`), `PlayerProvider` (`profile`, `refreshProfile()`, `authState`; loads after `ensureSession()`), `Providers` wrapping both + Toast.
- `components/shell/`: `AppShell` (header + main), `Header` (logo «تقريباً» in Reem Kufi linking home, streak flame with count when `current_streak > 0`, menu button), `NavDrawer` (اليوم، الأرشيف، المتصدرون، مجموعاتي، ملفي، اقترح سؤالاً، الإعدادات).
- `app/layout.tsx`: `<html lang="ar" dir="rtl">`, fonts, theme script, metadata (title «تقريباً — لعبة التقدير اليومية», description from tagline, `themeColor` both schemes, manifest link), Providers, AppShell.

## 7. Routes (pages are client components that use `lib/api.ts`)

| Route | Owner | Content |
|---|---|---|
| `/` | C1 | Home: hero (puzzle № + Arabic date, 3 progress dots, «العب اليوم» / «أكمل»), finished state (score, tier, Top %, countdown, share), كيف تلعب (3 steps), ما هو سؤال فيرمي؟ (own words), اقترح سؤالاً CTA, الأسئلة الشائعة (incl. comma = thousands separator, honour system, scoring = multiple + geometric mean, Qatar midnight). No-puzzle-today empty state. |
| `/play` | C1 | Today's puzzle game flow. |
| `/play/[puzzleNo]` | C1 | Any live puzzle (archive). Same flow; banner «لعب من الأرشيف — لا يُحتسب في المتصدرين». |
| `/leaderboard` | C2 | Tabs اليوم/الأسبوع/كل الأوقات/السلسلة; filter: الكل / جامعتي / each of my groups; `me` row pinned; min-days note; `hidden` state. |
| `/groups` | C2 | My groups, create (name + kind), join by code. |
| `/groups/[code]` | C2 | Group page: join prompt for non-members; members with today status (spoiler protected), group leaderboard tabs, copy invite link (`/groups/CODE`) + WhatsApp share; owner: rename, remove member, regenerate code; leave. |
| `/profile` | C2 | Stats (games, avg, best, current/best streak), personal distribution chart, edit display name + university. |
| `/settings` | C2 | Digits, theme, reduce motion, account (link email / sign in on another device / sign out), delete my data (confirm). |
| `/archive` | C2 | Past puzzles with my score/status → links to `/play/N`. |
| `/submit` | C2 | Submission form with validation + success state. |
| `app/manifest.ts`, icons, `public/sw.js` | C2 | PWA. SW: cache-first for static assets, network-first for navigations with offline fallback, never cache Supabase requests. Register only in production. |

### 7.1 Game flow (C1) — state machine from docs §3
Load `getPuzzle(n)`. Stage = first unguessed question → INPUT; else RESULTS.
INPUT: `السؤال 1 / 3`, question text (large), category chip, `GuessInput` (dir=ltr text input, `inputMode="decimal"`, unit at inline-end, live preview «سيتم تسجيل: 5,000,000», invalid → «أدخل رقماً أكبر من صفر»), calculator `Sheet` with «استخدم النتيجة», «ثبّت إجابتك» (Enter submits; button disabled while submitting; one tap locks).
REVEAL: «خمّنت X» → «الإجابة Y unit», result chip coloured by tier with arrow + «أقل/أكثر من الإجابة بـ N×» (or «إصابة دقيقة!» for exact), «أقرب من P% من اللاعبين» or «لا يوجد عدد كافٍ من اللاعبين بعد», `LogHistogram` (bins −12..12, markers أنت/الإجابة, axis labels answer×10^k compacted, text summary for screen readers, `aria-live="polite"`), collapsible «حساب على الورقة» (Markdown) + source link (+ as_of), «السؤال التالي» / «شاهد نتيجتك».
RESULTS: big score + tier title + square, «أفضل P%» (`top_pct`) or not-enough note, `ScoreDistribution` (bins 0..12, axis 1×/10×/100×/1000×), rows (position, question text, multiple, ⬇/⬆ + word, tier square), actions: شارك (Web Share API text; fallback copy), انسخ النص, صورة النتيجة (`html-to-image` 1080×1350 RTL card → share file or download), المتصدرون, مجموعاتي, countdown to next puzzle (today only). Tabs to re-open each question's reveal. After completion call `refreshProfile()` and `track('finish')`.

## 8. Phases and agents

| Phase | Agent | Model | Task |
|---|---|---|---|
| 1 | **A — Scaffold & core** | Sonnet | §3 deps, Next+Tailwind setup, §6.1–6.5, i18n seeds, unit tests, `supabase init` (config only, don't start), scripts in package.json. |
| 1 | **Q1, Q2 — Content** | Sonnet | 15 sourced questions each (puzzles 1–5 and 6–10). |
| 2 | **B — Database** | Sonnet | migrations, RPCs, local Supabase up, import + stats scripts, integration tests, `.env.local`/`.env.example`. |
| 2 | **C1 — Game UI** | Sonnet | §7 C1 routes + `components/game/`, `i18n/ar/game.ts`. |
| 2 | **C2 — Social UI** | Sonnet | §7 C2 routes + `components/social/`, `i18n/ar/social.ts`, PWA. |
| 3 | **D — Integration & QA** | Sonnet | reconcile `CONTRACT_CHANGES.md`, import content, build, run app, Playwright e2e (mobile viewport), screenshots light/dark, fix bugs, README. |
| 4 | Lead (Opus) | — | review, final verification, hand-off. |

### package.json scripts (Agent A creates; others fill in)
`dev, build, start, lint, typecheck (tsc --noEmit), test (vitest run tests/unit), test:integration (vitest run -c vitest.integration.config.ts), test:e2e (playwright test), db:start (supabase start -x <unneeded services>), db:stop, db:reset, import (tsx scripts/import-questions.ts), stats (tsx scripts/stats.ts)`.

## 9. Definition of done
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` all pass; `npm run test:e2e` passes against local Supabase.
- A fresh phone-width browser can: play today's puzzle (answers not in any network response before locking), refresh mid-puzzle and resume, see reveal + percentile/not-enough note + histogram + napkin math, finish and see results + share text + share image, create a group, open the invite link in a second session, join, see spoiler protection, see leaderboards, edit profile, change digits/theme, play an archive puzzle, submit a question.
- 30 questions imported (puzzles 1–10), each with a real `source_url` and napkin math.
- README explains local dev, content workflow, moderation, calibration, and deploying to Supabase Cloud + Vercel.
