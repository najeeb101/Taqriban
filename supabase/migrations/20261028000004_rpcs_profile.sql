-- Profile, archive-independent helpers, submissions, data deletion, admin stats.

create function private.profile_json(p_player uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', pl.id,
    'display_name', pl.display_name,
    'university', nullif(pl.university, ''),
    'digit_style', pl.digit_style,
    'games', (select count(*) from public.daily_results dr where dr.player_id = pl.id)::int,
    'avg_score', (select exp(avg(ln(dr.score)))::float8 from public.daily_results dr where dr.player_id = pl.id),
    'best_score', (select min(dr.score)::float8 from public.daily_results dr where dr.player_id = pl.id),
    'current_streak', coalesce((select s.current_streak from private.player_streaks(array[pl.id]) s), 0),
    'best_streak', coalesce((select s.best_streak from private.player_streaks(array[pl.id]) s), 0),
    'distribution', (select jsonb_agg(jsonb_build_object('bin', s.b, 'count', coalesce(d.c, 0)) order by s.b)
                       from generate_series(0, 12) as s(b)
                       left join (select private.score_bin(score) as b, count(*)::int as c
                                    from public.daily_results where player_id = pl.id group by 1) d on d.b = s.b)
  ) from public.players pl where pl.id = p_player
$$;

create function public.get_profile() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_player uuid := private.ensure_player();
begin
  return private.profile_json(v_player);
end $$;

create function public.update_profile(
  p_display_name text default null, p_university text default null, p_digit_style text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_name text;
  v_uni text;
begin
  perform private.check_rate(v_player, 'update_profile', 30, interval '1 hour');
  if p_display_name is not null then
    v_name := private.clean_name(p_display_name, 2, 24);
    update public.players set display_name = v_name where id = v_player;
  end if;
  if p_university is not null then
    v_uni := btrim(p_university);
    if v_uni = '' then
      update public.players set university = null where id = v_player;
    elsif private.valid_university(v_uni) then
      update public.players set university = v_uni where id = v_player;
    else
      raise exception 'invalid_input';
    end if;
  end if;
  if p_digit_style is not null then
    if p_digit_style not in ('latn', 'arab') then raise exception 'invalid_input'; end if;
    update public.players set digit_style = p_digit_style where id = v_player;
  end if;
  return private.profile_json(v_player);
end $$;

create function public.submit_question(
  p_text text, p_unit text default null, p_answer numeric default null,
  p_source_url text default null, p_napkin text default null, p_credit_name text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_text text := btrim(coalesce(p_text, ''));
  v_id bigint;
begin
  if char_length(v_text) < 10 or char_length(v_text) > 500 then raise exception 'invalid_input'; end if;
  if char_length(coalesce(p_unit, '')) > 60 then raise exception 'invalid_input'; end if;
  if p_answer is not null and (p_answer <= 0 or p_answer > 1e18) then raise exception 'invalid_input'; end if;
  if nullif(btrim(coalesce(p_source_url, '')), '') is not null
     and (btrim(p_source_url) !~* '^https?://\S+$' or char_length(p_source_url) > 500) then
    raise exception 'invalid_input';
  end if;
  if char_length(coalesce(p_napkin, '')) > 3000 then raise exception 'invalid_input'; end if;
  if char_length(coalesce(p_credit_name, '')) > 60 then raise exception 'invalid_input'; end if;
  perform private.check_rate(v_player, 'submit_question', 5, interval '1 day');

  insert into public.submissions(player_id, text_ar, unit_ar, proposed_answer, source_url, napkin_ar, credit_name)
  values (v_player, v_text, nullif(btrim(coalesce(p_unit, '')), ''), p_answer,
          nullif(btrim(coalesce(p_source_url, '')), ''), nullif(btrim(coalesce(p_napkin, '')), ''),
          nullif(private.sanitize_name(p_credit_name), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- Group ownership transfer / empty-group cleanup happens in the players BEFORE DELETE trigger.
create function public.delete_my_data() returns void
language plpgsql security definer set search_path = public as $$
declare v_player uuid := private.ensure_player();
begin
  delete from auth.users where id = v_player;
end $$;

-- Calibration report for scripts/stats.ts (service_role only).
create function public.admin_stats() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'questions', coalesce((select jsonb_agg(to_jsonb(s) order by s.puzzle_number, s.position) from private.question_stats s), '[]'::jsonb),
    'new_submissions', (select count(*) from public.submissions where status = 'new')::int
  )
$$;
