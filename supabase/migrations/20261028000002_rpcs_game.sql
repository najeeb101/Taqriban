-- Game RPCs: get_puzzle, submit_guess, get_histogram, get_results, get_archive.

-- Reveal JSON (Reveal in lib/types.ts) for a question the player has already guessed.
create function private.build_reveal(p_player uuid, p_question_id int) returns jsonb
language plpgsql stable as $$
declare
  g record;
  v_others int; v_worse int; v_players int;
begin
  select gu.guess, gu.multiple, gu.direction, qa.answer, qa.explanation_ar, qa.source_url, qa.source_name, qa.as_of
    into g
    from public.guesses gu
    join public.question_answers qa on qa.question_id = gu.question_id
   where gu.player_id = p_player and gu.question_id = p_question_id;
  if not found then return null; end if;

  select count(*) filter (where player_id <> p_player),
         count(*) filter (where player_id <> p_player and multiple > g.multiple),
         count(*)
    into v_others, v_worse, v_players
    from public.guesses where question_id = p_question_id;

  return jsonb_build_object(
    'question_id', p_question_id,
    'guess', g.guess::float8,
    'answer', g.answer::float8,
    'multiple', g.multiple::float8,
    'direction', g.direction,
    'explanation', g.explanation_ar,
    'source_url', g.source_url,
    'source_name', g.source_name,
    'as_of', g.as_of,
    'closer_than_pct', case when v_others >= 20 then round(100.0 * v_worse / v_others)::int else null end,
    'players', v_players
  );
end $$;

create function private.puzzle_state(p_player uuid, p_puzzle public.puzzles) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'puzzle_id', p_puzzle.id,
    'number', p_puzzle.number,
    'publish_date', to_char(p_puzzle.publish_date, 'YYYY-MM-DD'),
    'is_daily', p_puzzle.publish_date = private.qatar_today(),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'position', q.position, 'text', q.text_ar,
                                          'unit', q.unit_ar, 'category', q.category) order by q.position)
        from public.questions q where q.puzzle_id = p_puzzle.id), '[]'::jsonb),
    'reveals', coalesce((
      select jsonb_agg(private.build_reveal(p_player, q.id) order by q.position)
        from public.questions q
       where q.puzzle_id = p_puzzle.id
         and exists (select 1 from public.guesses g where g.player_id = p_player and g.question_id = q.id)), '[]'::jsonb),
    'daily_score', (select dr.score::float8 from public.daily_results dr
                     where dr.player_id = p_player and dr.puzzle_id = p_puzzle.id)
  )
$$;

create function public.get_puzzle(p_number int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_today date := private.qatar_today();
  v_puzzle public.puzzles;
begin
  if p_number is null then
    select * into v_puzzle from public.puzzles where publish_date = v_today and status <> 'draft';
  else
    select * into v_puzzle from public.puzzles
     where number = p_number and status <> 'draft' and publish_date <= v_today;
  end if;
  if v_puzzle.id is null then return null; end if;
  return private.puzzle_state(v_player, v_puzzle);
end $$;

create function public.submit_guess(p_question_id int, p_guess numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_today date := private.qatar_today();
  v_puzzle int;
  v_pub date;
  v_status text;
  v_daily boolean;
  v_new bigint;
  v_done int;
  v_total int;
  v_score numeric;
  v_reveal jsonb;
begin
  if p_guess is null or p_guess <= 0 or p_guess > 1e18 or p_guess < 1e-12 then
    raise exception 'invalid_guess';
  end if;

  select q.puzzle_id, p.publish_date, p.status into v_puzzle, v_pub, v_status
    from public.questions q
    join public.puzzles p on p.id = q.puzzle_id
    join public.question_answers qa on qa.question_id = q.id
   where q.id = p_question_id;
  if v_puzzle is null then raise exception 'unknown_question'; end if;
  if v_status = 'draft' or v_pub > v_today then raise exception 'puzzle_not_live'; end if;

  -- serialise this player's guesses (double taps, parallel questions)
  perform pg_advisory_xact_lock(hashtextextended('guess:' || v_player::text, 0));

  if exists (select 1 from public.guesses where player_id = v_player and question_id = p_question_id) then
    v_reveal := private.build_reveal(v_player, p_question_id);
    return v_reveal || jsonb_build_object(
      'daily_score', (select dr.score::float8 from public.daily_results dr
                       where dr.player_id = v_player and dr.puzzle_id = v_puzzle),
      'already_guessed', true);
  end if;

  v_daily := v_pub = v_today
    or (v_pub = v_today - 1 and exists (
          select 1 from public.guesses g join public.questions q on q.id = g.question_id
           where g.player_id = v_player and q.puzzle_id = v_puzzle and g.is_daily));

  insert into public.guesses(player_id, question_id, guess, is_daily)
  values (v_player, p_question_id, p_guess, v_daily)
  on conflict (player_id, question_id) do nothing
  returning id into v_new;

  if v_new is null then
    return private.build_reveal(v_player, p_question_id) || jsonb_build_object(
      'daily_score', (select dr.score::float8 from public.daily_results dr
                       where dr.player_id = v_player and dr.puzzle_id = v_puzzle),
      'already_guessed', true);
  end if;

  select count(*) into v_done from public.guesses g join public.questions q on q.id = g.question_id
   where g.player_id = v_player and q.puzzle_id = v_puzzle;
  select count(*) into v_total from public.questions where puzzle_id = v_puzzle;

  if v_done >= v_total then
    select exp(avg(ln(g.multiple))) into v_score
      from public.guesses g join public.questions q on q.id = g.question_id
     where g.player_id = v_player and q.puzzle_id = v_puzzle;
    insert into public.daily_results(player_id, puzzle_id, score, is_daily)
    select v_player, v_puzzle, greatest(v_score, 1), bool_and(g.is_daily)
      from public.guesses g join public.questions q on q.id = g.question_id
     where g.player_id = v_player and q.puzzle_id = v_puzzle
    on conflict (player_id, puzzle_id) do nothing;
  end if;

  return private.build_reveal(v_player, p_question_id) || jsonb_build_object(
    'daily_score', (select dr.score::float8 from public.daily_results dr
                     where dr.player_id = v_player and dr.puzzle_id = v_puzzle),
    'already_guessed', false);
end $$;

create function public.get_histogram(p_question_id int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_my int;
begin
  if not exists (select 1 from public.questions where id = p_question_id) then
    raise exception 'unknown_question';
  end if;
  select bin into v_my from public.guesses where player_id = v_player and question_id = p_question_id;
  if v_my is null then raise exception 'not_completed'; end if;

  return jsonb_build_object(
    'question_id', p_question_id,
    'bins', (select jsonb_agg(jsonb_build_object('bin', s.b, 'count', coalesce(h.count, 0)) order by s.b)
               from generate_series(-12, 12) as s(b)
               left join public.question_histogram h on h.question_id = p_question_id and h.bin = s.b),
    'total', coalesce((select sum(count) from public.question_histogram where question_id = p_question_id), 0)::int,
    'my_bin', v_my
  );
end $$;

create function public.get_results(p_puzzle_id int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_pz public.puzzles;
  v_dr public.daily_results;
  v_total int;
  v_le int;
begin
  select * into v_pz from public.puzzles where id = p_puzzle_id;
  if v_pz.id is null then raise exception 'not_found'; end if;
  select * into v_dr from public.daily_results where player_id = v_player and puzzle_id = p_puzzle_id;
  if v_dr.player_id is null then raise exception 'not_completed'; end if;

  select count(*), count(*) filter (where score <= v_dr.score)
    into v_total, v_le
    from public.daily_results where puzzle_id = p_puzzle_id and is_daily;

  return jsonb_build_object(
    'puzzle_id', v_pz.id,
    'number', v_pz.number,
    'publish_date', to_char(v_pz.publish_date, 'YYYY-MM-DD'),
    'is_daily', v_dr.is_daily,
    'score', v_dr.score::float8,
    'top_pct', case when v_total >= 20 then
        case when v_dr.is_daily then ceil(100.0 * v_le / v_total)
             else ceil(100.0 * (v_le + 1) / (v_total + 1)) end::int
      else null end,
    'players', v_total,
    'rows', (select jsonb_agg(jsonb_build_object(
                'question_id', q.id, 'position', q.position, 'text', q.text_ar, 'unit', q.unit_ar,
                'guess', g.guess::float8, 'answer', qa.answer::float8,
                'multiple', g.multiple::float8, 'direction', g.direction) order by q.position)
               from public.questions q
               join public.guesses g on g.question_id = q.id and g.player_id = v_player
               join public.question_answers qa on qa.question_id = q.id
              where q.puzzle_id = p_puzzle_id),
    'distribution', (select jsonb_agg(jsonb_build_object('bin', s.b, 'count', coalesce(d.c, 0)) order by s.b)
                       from generate_series(0, 12) as s(b)
                       left join (select private.score_bin(score) as b, count(*)::int as c
                                    from public.daily_results
                                   where puzzle_id = p_puzzle_id and is_daily
                                   group by 1) d on d.b = s.b),
    'my_bin', private.score_bin(v_dr.score)
  );
end $$;

create function public.get_archive() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_today date := private.qatar_today();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'puzzle_id', p.id,
             'number', p.number,
             'publish_date', to_char(p.publish_date, 'YYYY-MM-DD'),
             'is_today', p.publish_date = v_today,
             'answered', (select count(*) from public.guesses g join public.questions q on q.id = g.question_id
                           where g.player_id = v_player and q.puzzle_id = p.id)::int,
             'total', (select count(*) from public.questions q where q.puzzle_id = p.id)::int,
             'score', dr.score::float8,
             'played_daily', dr.is_daily
           ) order by p.publish_date desc)
      from public.puzzles p
      left join public.daily_results dr on dr.puzzle_id = p.id and dr.player_id = v_player
     where p.status <> 'draft' and p.publish_date <= v_today), '[]'::jsonb);
end $$;
