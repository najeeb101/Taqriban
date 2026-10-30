-- Public leaderboards rank only players with an account (email linked, not anonymous).
-- Guests can still play and see the boards; they just are not listed until they add an email.
-- Group boards are unchanged: every member is shown.

create function private.has_account(p_player uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = p_player and not coalesce(u.is_anonymous, false))
$$;
revoke all on function private.has_account(uuid) from public, anon, authenticated;

create or replace function public.get_leaderboard(
  p_scope text, p_group_id uuid default null, p_university text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_today date := private.qatar_today();
  v_today_puzzle int;
  v_hidden boolean := false;
  v_finishers int;
  v_entries jsonb;
  v_me jsonb;
  v_uni text := nullif(btrim(coalesce(p_university, '')), '');
begin
  if p_scope is null or p_scope not in ('day', 'week', 'all', 'streak') then
    raise exception 'invalid_input';
  end if;
  if p_group_id is not null and not private.is_member(p_group_id, v_player) then
    raise exception 'not_member';
  end if;

  select id into v_today_puzzle from public.puzzles where publish_date = v_today and status <> 'draft';

  select count(*)::int into v_finishers
    from public.daily_results dr
    join public.players pl on pl.id = dr.player_id
   where dr.puzzle_id = v_today_puzzle and dr.is_daily
     and (v_uni is null or pl.university = v_uni)
     and (p_group_id is null or private.is_member(p_group_id, pl.id));

  if p_group_id is not null and p_scope = 'day' then
    v_hidden := not exists (select 1 from public.daily_results
                             where player_id = v_player and puzzle_id = v_today_puzzle);
  end if;
  if v_hidden then
    return jsonb_build_object('scope', p_scope, 'entries', '[]'::jsonb, 'me', null,
                              'hidden', true, 'finishers', coalesce(v_finishers, 0));
  end if;

  with sp as (
    select pl.id, pl.display_name, pl.university
      from public.players pl
     where (v_uni is null or pl.university = v_uni)
       and (p_group_id is null or private.is_member(p_group_id, pl.id))
       -- Public boards rank account holders only; groups still show every member.
       and (p_group_id is not null or private.has_account(pl.id))
  ),
  agg as (
    select dr.player_id,
           exp(avg(ln(dr.score))) as sc,
           count(*)::int as d,
           max(dr.completed_at) as ca
      from public.daily_results dr
      join public.puzzles pz on pz.id = dr.puzzle_id
     where p_scope in ('day', 'week', 'all')
       and dr.is_daily and pz.status <> 'draft' and pz.publish_date <= v_today
       and case p_scope when 'day' then pz.publish_date = v_today
                        when 'week' then pz.publish_date >= v_today - 6
                        else true end
       and dr.player_id in (select id from sp)
     group by dr.player_id
  ),
  st as (
    select * from private.player_streaks((select array_agg(id) from sp)) where p_scope = 'streak'
  ),
  j as (
    select sp.id, sp.display_name, sp.university,
           agg.sc, agg.d, agg.ca, coalesce(st.current_streak, 0) as cs,
           case p_scope when 'day' then agg.d is not null
                        when 'week' then coalesce(agg.d, 0) >= 3
                        when 'all' then coalesce(agg.d, 0) >= 10
                        else coalesce(st.current_streak, 0) >= 1 end as ok
      from sp
      left join agg on agg.player_id = sp.id
      left join st on st.player_id = sp.id
  ),
  r as (
    select case when j.ok then
             (rank() over (partition by j.ok order by
                case when p_scope = 'streak' then -j.cs end,
                case when p_scope <> 'streak' then j.sc end,
                case when p_scope = 'day' then j.ca end,
                case when p_scope in ('week', 'all') then -j.d end))::int
           end as rank,
           j.id as player_id, j.display_name, j.university,
           case when p_scope = 'streak' then null else j.sc::float8 end as score,
           case when p_scope in ('week', 'all') then j.d end as days,
           case when p_scope = 'streak' then j.cs end as streak,
           j.id = v_player as is_me
      from j
     where j.ok or p_group_id is not null
  ),
  top as (
    select * from r order by rank nulls last, display_name, player_id
     limit case when p_group_id is null then 100 else 1000 end
  )
  select coalesce((select jsonb_agg(to_jsonb(t) order by t.rank nulls last, t.display_name, t.player_id) from top t), '[]'::jsonb),
         (select to_jsonb(r2) from r r2 where r2.is_me)
    into v_entries, v_me;

  return jsonb_build_object('scope', p_scope, 'entries', v_entries, 'me', v_me,
                            'hidden', false, 'finishers', coalesce(v_finishers, 0));
end $$;
