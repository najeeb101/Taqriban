-- Private admin dashboard (/admin): analytics, feedback inbox, question submissions, question calibration.
-- Admins are listed by email in public.admins (managed with `npm run admin -- add <email>` or Supabase Studio).
-- A caller is an admin only when signed in with a confirmed, non-anonymous email that is on that list.

create table public.admins (
  email    text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;

create function private.caller_is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1
      from auth.users u
      join public.admins a on a.email = lower(u.email)
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and coalesce(u.is_anonymous, false) = false
  )
$$;

create function private.require_admin() returns void
language plpgsql stable as $$
begin
  if not private.caller_is_admin() then raise exception 'forbidden'; end if;
end $$;

-- Qatar calendar day of a timestamp.
create function private.qatar_day(p_at timestamptz) returns date
language sql immutable as $$ select (p_at at time zone 'Asia/Qatar')::date $$;

create function public.admin_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select private.caller_is_admin()
$$;

create function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := private.qatar_today();
begin
  perform private.require_admin();
  return jsonb_build_object(
    'today', v_today,
    'kpis', jsonb_build_object(
      'players_total',      (select count(*) from public.players),
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

create function public.admin_list_feedback(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(f) order by f.created_at desc)
      from (
        select fb.id, fb.kind, fb.rating, fb.message, fb.contact, fb.status, fb.created_at,
               pl.display_name, pl.university
          from public.feedback fb
          left join public.players pl on pl.id = fb.player_id
         where p_status is null or fb.status = p_status
         order by fb.created_at desc
         limit 300
      ) f
  ), '[]'::jsonb);
end $$;

create function public.admin_set_feedback_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.require_admin();
  if p_status is null or p_status not in ('new', 'read', 'done') then raise exception 'invalid_input'; end if;
  update public.feedback set status = p_status where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create function public.admin_list_submissions(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(s) order by s.created_at desc)
      from (
        select sb.id, sb.text_ar, sb.unit_ar, sb.proposed_answer::float8 as proposed_answer, sb.source_url,
               sb.napkin_ar, sb.credit_name, sb.status, sb.created_at, pl.display_name
          from public.submissions sb
          left join public.players pl on pl.id = sb.player_id
         where p_status is null or sb.status = p_status
         order by sb.created_at desc
         limit 300
      ) s
  ), '[]'::jsonb);
end $$;

create function public.admin_set_submission_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.require_admin();
  if p_status is null or p_status not in ('new', 'reviewing', 'accepted', 'rejected', 'scheduled') then
    raise exception 'invalid_input';
  end if;
  update public.submissions set status = p_status where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

revoke execute on function
  public.admin_is_admin(),
  public.admin_dashboard(),
  public.admin_list_feedback(text),
  public.admin_set_feedback_status(bigint, text),
  public.admin_list_submissions(text),
  public.admin_set_submission_status(bigint, text)
from public, anon;

-- Each function checks private.require_admin() itself; non-admins get `forbidden`.
grant execute on function
  public.admin_is_admin(),
  public.admin_dashboard(),
  public.admin_list_feedback(text),
  public.admin_set_feedback_status(bigint, text),
  public.admin_list_submissions(text),
  public.admin_set_submission_status(bigint, text)
to authenticated;
