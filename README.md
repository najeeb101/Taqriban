# Taqriban («تقريباً»)

> لعبة يومية لتقدير الأرقام: ثلاثة أسئلة مستحيلة، تخمينة واحدة لكل سؤال، والأقرب يفوز.

An Arabic-first, RTL, mobile-first daily Fermi-estimation game. Each day: 3 questions, one locked guess per question, scored by how many times off you were (a multiple, and a geometric mean per day). Answers stay on the server until a guess is locked. Includes leaderboards, private groups, streaks, an archive, question submissions and a PWA shell. UI language: Arabic only.

## Tech stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + anonymous auth; all data access via `security definer` RPCs) · Vitest (unit + integration) · Playwright (e2e) · `html-to-image` (share card) · Readex Pro + El Messiri + Marhey.

## Prerequisites
Node 22, npm, Docker (for the local Supabase stack).

## Local setup
```bash
npm install
npm run db:start                       # local Supabase (API on 55321 per supabase/config.toml)
npx supabase status -o env             # copy values into .env.local (see .env.example)
npx supabase db reset                  # apply migrations
npm run import -- --start 2026-10-26   # import content/questions; puzzle N publishes on start + N - 1
npm run dev                            # http://localhost:3100
```
`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (scripts/tests only) and `NEXT_PUBLIC_SITE_URL=http://localhost:3100`.

## Scripts
| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next dev server / production build / serve build (all on port 3100) |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:integration` | RPC/DB tests against local Supabase (clean up after themselves) |
| `npm run test:e2e` | Playwright mobile e2e against the production build (starts it if not running) |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase lifecycle / reapply migrations |
| `npm run import -- --start YYYY-MM-DD [--dry-run]` | Import `content/questions` (service role) |
| `npm run stats` | Calibration report per question |

## Project structure
```
app/            routes (/, /play, /play/[n], /leaderboard, /groups, /groups/[code], /profile, /settings, /archive, /submit)
components/     ui/ primitives, providers/, shell/, game/, social/
lib/            pure logic (scoring, parseGuess, calc, format, share) + api.ts (the only backend entry point)
i18n/ar/        all Arabic strings
supabase/       config + migrations (schema, RPCs, privileges)
scripts/        import-questions.ts, stats.ts
content/        questions/pNNN-qP.md + README (format & checklist)
tests/          unit/, integration/, e2e/
Docs/           PLAN.md (decisions), kickoff and design docs
```

## Content workflow
Read `content/README.md` (format and quality checklist). One file per question (`pNNN-qP.md`) with sourced answer and napkin math; a second reviewer re-checks the number against the source. Import with `npm run import -- --start <launch date>`; puzzle N goes live on `start + (N - 1)` days (Asia/Qatar). Re-running the import updates existing puzzles. There is no cron: a puzzle is live when its date is today or past and its status is not `draft`.

## Moderation
User submissions land in the `submissions` table. Review them in Supabase Studio (local: http://127.0.0.1:55323, Table Editor). Statuses: `new`, `reviewing`, `accepted`, `rejected`, `scheduled`. Accepted ideas are turned into content files by hand.

Player feedback from `/feedback` (also linked in the menu and on the home page) lands in the `feedback` table: `kind` (`idea`, `bug`, `like`, `other`), optional `rating` 1-5, `message`, optional `contact`. Mark rows `read` or `done` in the `status` column as you work through them.

## Admin dashboard
`/admin` (not linked from the menu) shows players and activity, the feedback inbox, question submissions and question calibration, and lets you change feedback and submission statuses.
1. In the app, open Settings and link your email (local: confirm it in Mailpit at http://127.0.0.1:55324).
2. `npm run admin -- add you@example.com` (also `list` and `remove <email>`; uses the service-role key from the environment, so it works against Cloud too).
3. Open `/admin`. Anyone who is not a signed-in admin sees a locked page, and every admin RPC refuses them with `forbidden`.

## Calibration
`npm run stats` prints, per question, players, median multiple and the share of low/high guesses, to spot questions that are too easy, too hard or biased.

## Testing
`npm test`, `npm run test:integration` (needs local Supabase running and `.env.local`), `npm run test:e2e` (needs the same plus imported content where puzzle 3 is today; the e2e run deletes the users it creates). Typical full check: `typecheck && lint && test && test:integration && build && test:e2e`.

## Deployment
**Supabase Cloud**
1. Create a project. Authentication: enable *Anonymous sign-ins* and the *Email* provider. Set Site URL to your production URL and add `<url>/settings` to redirect URLs.
2. `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Import content with the cloud URL and **service-role key** in the environment: `npm run import -- --start <launch date>`.

**Vercel**
Import the repo; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (and optionally `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`) from `.env.example`. Never expose the service-role key to Vercel's client env.

## Design decisions and deviations
See [`Docs/PLAN.md`](Docs/PLAN.md) (section 2) and `Docs/CONTRACT_CHANGES.md`. Highlights: all data access via RPCs with RLS deny-all; histogram bins centred on the answer with symmetric rounding; content in `content/questions` with puzzle numbers mapped to dates at import; archive plays count for personal stats only; a daily puzzle started before Qatar midnight can be finished the next day and still counts as daily.

## Known limitations
- Arabic only; no Google sign-in; no admin UI (use Supabase Studio).
- Anonymous accounts are per browser; link an email in Settings to keep progress across devices.
- Honour system: nothing stops a player from searching for answers.
- The share-card PNG is rendered in the browser; verify on iOS Safari (fonts, first-render blank).
- The service worker only runs in production builds.
