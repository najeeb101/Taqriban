# Contract changes

Append-only log: agents note here any needed change to frozen contracts (`lib/types.ts`, `lib/api.ts` signatures, RPC shapes, npm deps) instead of editing them; the integrator reconciles.
- [C2] No contract changes needed. Notes: ButtonLink has no icon prop (put icons in children). Archive/leaderboard assume get_archive/get_leaderboard shapes exactly as PLAN 6.1. /submit treats source URL as optional client-side (server may require it).

## Agent C1 (Game UI)
- No changes to `lib/types.ts` / `lib/api.ts` signatures required.
- Assumptions on the backend contract: `submit_guess` result's `daily_score` is non-null on the final guess; `get_results` works immediately after the last guess; `Reveal.as_of` is a display-ready string (digits are localized client-side); `Results.rows` carry `position` (UI sorts by it).
- `npm run typecheck` currently reports 3 errors in `scripts/import-questions.ts` (Agent B: `existing` / `row` / `saved` possibly null) - not from C1 code.
- Optional env: `NEXT_PUBLIC_SITE_URL` is used for the URL in share text and the share card (falls back to `location.origin`).
- Share-card font note: the PNG uses the page's loaded fonts (`--font-plex`, `--font-reem` from layout); verify in a real browser that Safari renders the Arabic text (first `toPng` call is a warm-up).

## Agent D (Integration & QA)
- New migration `20261028000006_daily_rollover.sql`: `get_puzzle.is_daily` is now true for yesterday's puzzle when the caller already has an `is_daily` guess on it (PLAN 5.3). Shape unchanged.
- `submit_question` already accepts null/empty `p_source_url` (http(s) validated only when provided); client matches. No contract change.
- i18n: `categoryLabel()` (lib/i18n re-export) maps content category slugs to Arabic; `tooLow`/`tooHigh` templates no longer contain the `×` and `topPct`/`closerThan` no longer contain `%` (callers append them inside the LTR `Num` isolate so the sign sits after the number in RTL).
