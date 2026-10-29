# Contract changes

Append-only log: agents note here any needed change to frozen contracts (`lib/types.ts`, `lib/api.ts` signatures, RPC shapes, npm deps) instead of editing them; the integrator reconciles.
- [C2] No contract changes needed. Notes: ButtonLink has no icon prop (put icons in children). Archive/leaderboard assume get_archive/get_leaderboard shapes exactly as PLAN 6.1. /submit treats source URL as optional client-side (server may require it).

## Agent C1 (Game UI)
- No changes to `lib/types.ts` / `lib/api.ts` signatures required.
- Assumptions on the backend contract: `submit_guess` result's `daily_score` is non-null on the final guess; `get_results` works immediately after the last guess; `Reveal.as_of` is a display-ready string (digits are localized client-side); `Results.rows` carry `position` (UI sorts by it).
- `npm run typecheck` currently reports 3 errors in `scripts/import-questions.ts` (Agent B: `existing` / `row` / `saved` possibly null) - not from C1 code.
- Optional env: `NEXT_PUBLIC_SITE_URL` is used for the URL in share text and the share card (falls back to `location.origin`).
- Share-card font note: the PNG uses the page's loaded fonts (`--font-readex`, `--font-messiri`, `--font-marhey` from layout); verify in a real browser that Safari renders the Arabic text (first `toPng` call is a warm-up).

## Agent D (Integration & QA)
- New migration `20261028000006_daily_rollover.sql`: `get_puzzle.is_daily` is now true for yesterday's puzzle when the caller already has an `is_daily` guess on it (PLAN 5.3). Shape unchanged.
- `submit_question` already accepts null/empty `p_source_url` (http(s) validated only when provided); client matches. No contract change.
- i18n: `categoryLabel()` (lib/i18n re-export) maps content category slugs to Arabic; `tooLow`/`tooHigh` templates no longer contain the `×` and `topPct`/`closerThan` no longer contain `%` (callers append them inside the LTR `Num` isolate so the sign sits after the number in RTL).

## 2026-10-29 (design + feedback pass)
- New migration `20261029000001_feedback.sql`: table `feedback` (RLS on, no policies) and RPC `submit_feedback(p_kind text, p_message text, p_rating int, p_contact text) -> {id}`, granted to `authenticated` only, rate-limited to 10 per player per day. Raises `invalid_input` / `rate_limited` like `submit_question`.
- `lib/types.ts`: added `FeedbackKind` and `FeedbackInput`; `lib/api.ts`: added `submitFeedback()`. Existing types and signatures unchanged.
- `scripts/import-questions.ts`: answers above 100,000,000 are rejected (Fermi-style barrier, see content/README.md "Style"); statistics-style units only warn.
- New migration `20261029000002_admin.sql`: table `admins(email)` and admin-only RPCs `admin_is_admin()`, `admin_dashboard()`, `admin_list_feedback(p_status)`, `admin_set_feedback_status(p_id, p_status)`, `admin_list_submissions(p_status)`, `admin_set_submission_status(p_id, p_status)`. An admin is a signed-in, confirmed, non-anonymous user whose email is in `admins`; everyone else gets the new error code `forbidden` (added to `SERVER_CODES` and the Arabic error table). `scripts/admin.ts` (`npm run admin`) manages the list.
- `lib/types.ts`: added `AdminDashboard`, `AdminFeedback`, `AdminSubmission`, `FeedbackStatus`, `SubmissionStatus`; `lib/api.ts`: matching `admin*()` wrappers. `t.admin` string table (`i18n/ar/admin.ts`).
- Migration `20261029000003_admin_played_kpi.sql`: `admin_dashboard().kpis.players_played` (players with at least one guess). The admin page labels `players_total` as visitors (every new browser gets an anonymous account).
- Migration `20261029000004_admin_email_alerts.sql`: triggers on `feedback` and `submissions` email every admin through the Resend API (pg_net). The key is the Vault secret `resend_api_key` (optional `alert_from_email`); without it nothing is sent.
