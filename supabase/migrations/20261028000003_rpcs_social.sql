-- Leaderboards and groups.

create function private.gen_join_code() returns text
language plpgsql volatile as $$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where join_code = v_code);
  end loop;
  return v_code;
end $$;

create function private.norm_code(p_code text) returns text
language sql immutable as $$ select upper(btrim(coalesce(p_code, ''))) $$;

create function private.is_member(p_group uuid, p_player uuid) returns boolean
language sql stable as $$
  select exists (select 1 from public.group_members where group_id = p_group and player_id = p_player)
$$;

create function private.group_summary(p_group uuid, p_player uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'kind', g.kind, 'join_code', g.join_code,
    'members', (select count(*) from public.group_members m where m.group_id = g.id)::int,
    'is_owner', g.owner_id = p_player)
    from public.groups g where g.id = p_group
$$;

create function public.get_leaderboard(
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

create function public.create_group(p_name text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_name text;
  v_id uuid;
  v_code text;
begin
  if p_kind is null or p_kind not in ('friends', 'class', 'club', 'university') then
    raise exception 'invalid_input';
  end if;
  v_name := private.clean_name(p_name, 2, 40);
  perform private.check_rate(v_player, 'create_group', 10, interval '1 day');
  loop
    v_code := private.gen_join_code();
    begin
      insert into public.groups(name, kind, join_code, owner_id) values (v_name, p_kind, v_code, v_player)
      returning id into v_id;
      exit;
    exception when unique_violation then
      null; -- collision, retry
    end;
  end loop;
  insert into public.group_members(group_id, player_id) values (v_id, v_player);
  return private.group_summary(v_id, v_player);
end $$;

create function public.join_group(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_id uuid;
begin
  perform private.check_rate(v_player, 'join_group', 30, interval '1 hour');
  select id into v_id from public.groups where join_code = private.norm_code(p_code);
  if v_id is null then raise exception 'invalid_code'; end if;
  insert into public.group_members(group_id, player_id) values (v_id, v_player) on conflict do nothing;
  return private.group_summary(v_id, v_player);
end $$;

create function public.leave_group(p_group_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_owner uuid;
  v_next uuid;
begin
  select owner_id into v_owner from public.groups where id = p_group_id for update;
  if not found then raise exception 'not_found'; end if;
  if not private.is_member(p_group_id, v_player) then raise exception 'not_member'; end if;

  select player_id into v_next from public.group_members
   where group_id = p_group_id and player_id <> v_player order by joined_at, player_id limit 1;

  if v_next is null then
    delete from public.groups where id = p_group_id;
    return;
  end if;
  if v_owner = v_player then
    update public.groups set owner_id = v_next where id = p_group_id;
  end if;
  delete from public.group_members where group_id = p_group_id and player_id = v_player;
end $$;

create function public.get_my_groups() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_player uuid := private.ensure_player();
begin
  return coalesce((
    select jsonb_agg(private.group_summary(m.group_id, v_player) order by m.joined_at, m.group_id)
      from public.group_members m where m.player_id = v_player), '[]'::jsonb);
end $$;

create function public.get_group(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_today date := private.qatar_today();
  v_g public.groups;
  v_member boolean;
  v_pz int;
  v_hidden boolean;
  v_count int;
  v_fin int;
begin
  select * into v_g from public.groups where join_code = private.norm_code(p_code);
  if v_g.id is null then return null; end if;
  v_member := private.is_member(v_g.id, v_player);
  select id into v_pz from public.puzzles where publish_date = v_today and status <> 'draft';
  select count(*)::int into v_count from public.group_members where group_id = v_g.id;
  select count(*)::int into v_fin
    from public.group_members m
    join public.daily_results dr on dr.player_id = m.player_id and dr.puzzle_id = v_pz and dr.is_daily
   where m.group_id = v_g.id;
  v_hidden := not v_member or not exists (select 1 from public.daily_results
                                           where player_id = v_player and puzzle_id = v_pz);

  return jsonb_build_object(
    'id', v_g.id, 'name', v_g.name, 'kind', v_g.kind,
    'join_code', case when v_member then v_g.join_code end,
    'is_member', v_member,
    'is_owner', v_g.owner_id = v_player,
    'member_count', v_count,
    'members', case when not v_member then '[]'::jsonb else coalesce((
        select jsonb_agg(jsonb_build_object(
                 'player_id', x.id, 'display_name', x.display_name, 'university', x.university,
                 'is_owner', x.id = v_g.owner_id, 'is_me', x.id = v_player,
                 'finished_today', x.score is not null,
                 'today_score', case when v_hidden or x.score is null then null else x.score::float8 end,
                 'streak', coalesce(s.current_streak, 0)
               ) order by (x.score is null), x.score, x.joined_at, x.id)
          from (select pl.id, pl.display_name, pl.university, m.joined_at, dr.score
                  from public.group_members m
                  join public.players pl on pl.id = m.player_id
                  left join public.daily_results dr on dr.player_id = pl.id and dr.puzzle_id = v_pz and dr.is_daily
                 where m.group_id = v_g.id) x
          left join private.player_streaks((select array_agg(player_id) from public.group_members where group_id = v_g.id)) s
                 on s.player_id = x.id), '[]'::jsonb) end,
    'hidden', v_hidden,
    'finishers_today', v_fin
  );
end $$;

create function private.require_owner(p_group uuid, p_player uuid) returns void
language plpgsql stable as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.groups where id = p_group;
  if not found then raise exception 'not_found'; end if;
  if v_owner <> p_player then raise exception 'not_owner'; end if;
end $$;

create function public.rename_group(p_group_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_player uuid := private.ensure_player();
begin
  perform private.require_owner(p_group_id, v_player);
  update public.groups set name = private.clean_name(p_name, 2, 40) where id = p_group_id;
end $$;

create function public.remove_member(p_group_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_player uuid := private.ensure_player();
begin
  perform private.require_owner(p_group_id, v_player);
  if p_player_id = v_player then raise exception 'invalid_input'; end if;
  delete from public.group_members where group_id = p_group_id and player_id = p_player_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create function public.regenerate_code(p_group_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_code text;
begin
  perform private.require_owner(p_group_id, v_player);
  v_code := private.gen_join_code();
  update public.groups set join_code = v_code where id = p_group_id;
  return v_code;
end $$;
