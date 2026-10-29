-- Admin dashboard: add players_played (players with at least one guess, ever). players_total counts every
-- account, and anonymous accounts are created for every new browser that opens the site, so it is really visitors.
create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := private.qatar_today();
begin
  perform private.require_admin();
  return jsonb_build_object(
    'today', v_today,
    'kpis', jsonb_build_object(
      'players_total',      (select count(*) from public.players),
      'players_played',     (select count(distinct player_id) from public.guesses),
      'players_new_7d',     (select count(*) from public.players where private.qatar_day(created_at) > v_today - 7),
      'players_with_email', (select count(*) from auth.users where email is not null and coalesce(is_anonymous, false) = false),
      'active_today',       (select count(distinct player_id) from public.guesses where private.qatar_day(created_at) = v_today),
      'active_7d',          (select count(distinct player_id) from public.guesses where private.qatar_day(created_at) > v_today - 7),
      'returning_7d',       (select count(*) from (
                               select player_id from public.guesses
                                where private.qatar_day(created_at) > v_today - 7
                                group by player_id
                               having count(distinct private.qatar_day(created_at)) >= 2) r),
      'completions_today',  (select count(*) from public.daily_results dr join public.puzzles p on p.id = dr.puzzle_id
                              where dr.is_daily and p.publish_date = v_today),
      'avg_score_7d',       (select exp(avg(ln(score)))::float8 from public.daily_results
                              where is_daily and private.qatar_day(completed_at) > v_today - 7),
      'guesses_total',      (select count(*) from public.guesses),
      'groups_total',       (select count(*) from public.groups),
      'feedback_new',       (select count(*) from public.feedback where status = 'new'),
      'feedback_total',     (select count(*) from public.feedback),
      'feedback_avg_rating',(select avg(rating)::float8 from public.feedback where rating is not null),
      'submissions_new',    (select count(*) from public.submissions where status = 'new')
    ),
    'activity', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', s.day, 'new_players', s.new_players, 'active_players', s.active_players, 'completions', s.completions)
             order by s.day), '[]'::jsonb)
        from (
          select g.day,
                 (select count(*) from public.players where private.qatar_day(created_at) = g.day) as new_players,
                 (select count(distinct player_id) from public.guesses where private.qatar_day(created_at) = g.day) as active_players,
                 (select count(*) from public.daily_results where private.qatar_day(completed_at) = g.day) as completions
            from (select (v_today - i) as day from generate_series(0, 13) as i) g
        ) s
    ),
    'puzzles', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.number desc), '[]'::jsonb)
        from (
          select p.number, p.publish_date,
                 (select count(distinct g.player_id) from public.guesses g join public.questions q on q.id = g.question_id
                   where q.puzzle_id = p.id) as players,
                 (select count(*) from public.daily_results dr where dr.puzzle_id = p.id) as completions,
                 (select count(*) from public.daily_results dr where dr.puzzle_id = p.id and dr.is_daily) as daily_completions,
                 (select exp(avg(ln(dr.score)))::float8 from public.daily_results dr where dr.puzzle_id = p.id) as avg_score
            from public.puzzles p
           where p.status <> 'draft' and p.publish_date <= v_today
           order by p.number desc
           limit 14
        ) s
    ),
    'questions', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.puzzle_number desc, s.position), '[]'::jsonb)
        from private.question_stats s
        join public.puzzles p on p.number = s.puzzle_number
       where p.status <> 'draft' and p.publish_date <= v_today
    ),
    'universities', (
      select coalesce(jsonb_agg(jsonb_build_object('university', u.university, 'players', u.n) order by u.n desc), '[]'::jsonb)
        from (select university, count(*) as n from public.players group by university order by n desc limit 12) u
    )
  );
end $$;
