-- get_puzzle.is_daily: true for today's puzzle, or for yesterday's puzzle the caller already
-- started as a daily play (finishing it the next day still counts as daily; PLAN 5.3).
create or replace function private.puzzle_state(p_player uuid, p_puzzle public.puzzles) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'puzzle_id', p_puzzle.id,
    'number', p_puzzle.number,
    'publish_date', to_char(p_puzzle.publish_date, 'YYYY-MM-DD'),
    'is_daily', p_puzzle.publish_date = private.qatar_today()
      or (p_puzzle.publish_date = private.qatar_today() - 1 and exists (
            select 1 from public.guesses g join public.questions q2 on q2.id = g.question_id
             where g.player_id = p_player and q2.puzzle_id = p_puzzle.id and g.is_daily)),
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
