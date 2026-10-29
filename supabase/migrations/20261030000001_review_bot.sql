-- AI review of player question suggestions (a daily Claude Code cloud routine, see Docs/REVIEW_BOT.md).
-- The bot calls the bot_* RPCs with the anon key plus a shared token; the token lives in Vault as `review_bot_token`
-- (and in the routine's environment as REVIEW_BOT_TOKEN). Without the Vault secret every bot_* call is refused.
-- Approved questions wait in question_pool; bot_fill_schedule turns them into puzzles at least 3 days ahead,
-- only when fewer than 7 days are scheduled, so file-based batches (npm run import) stay the main source.

alter table public.submissions
  add column ai_verdict     text check (ai_verdict in ('approve', 'reject', 'unsure')),
  add column ai_reason      text,
  add column ai_reviewed_at timestamptz;

create table public.question_pool (
  id             bigserial primary key,
  submission_id  bigint references public.submissions(id) on delete set null,
  position       smallint not null check (position between 1 and 3),
  text_ar        text     not null,
  unit_ar        text     not null,
  category       text,
  region         text,
  difficulty     smallint check (difficulty between 1 and 5),
  answer         numeric  not null check (answer > 0 and answer <= 100000000),
  as_of          text,
  source_url     text     not null check (source_url ~ '^https?://'),
  source_name    text,
  explanation_ar text     not null,
  notes_ar       text,
  status         text     not null default 'ready' check (status in ('ready', 'used', 'withdrawn')),
  question_id    int references public.questions(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.question_pool enable row level security;
revoke all on table public.question_pool from anon, authenticated;

create function private.require_bot(p_token text) returns void
language plpgsql stable security definer set search_path = public as $$
declare v_token text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'review_bot_token' limit 1;
  if v_token is null or length(v_token) < 32 or p_token is distinct from v_token then
    raise exception 'forbidden';
  end if;
end $$;

-- Everything the reviewer needs in one call: new suggestions, existing questions (for duplicates), runway.
create function public.bot_context(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require_bot(p_token);
  return jsonb_build_object(
    'today', private.qatar_day(now()),
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'text_ar', s.text_ar, 'unit_ar', s.unit_ar,
               'proposed_answer', s.proposed_answer::float8, 'source_url', s.source_url,
               'napkin_ar', s.napkin_ar, 'credit_name', s.credit_name, 'created_at', s.created_at)
             order by s.id)
        from (select * from public.submissions where status = 'new' order by id limit 20) s), '[]'::jsonb),
    'existing_questions', coalesce((
      select jsonb_agg(t.text_ar) from (
        select q.text_ar from public.questions q
        union all
        select p.text_ar from public.question_pool p where p.status = 'ready') t), '[]'::jsonb),
    'last_scheduled_date', (select max(publish_date) from public.puzzles),
    'pool_ready', jsonb_build_object(
      '1', (select count(*) from public.question_pool where status = 'ready' and position = 1),
      '2', (select count(*) from public.question_pool where status = 'ready' and position = 2),
      '3', (select count(*) from public.question_pool where status = 'ready' and position = 3)));
end $$;

-- Records the verdict for one suggestion that is still `new` (an admin's own decision is never overwritten).
-- approve -> status accepted + one pool row from p_question; reject -> rejected; unsure -> reviewing (left for a human).
create function public.bot_record_review(p_token text, p_id bigint, p_verdict text, p_reason text, p_question jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pool bigint;
begin
  perform private.require_bot(p_token);
  if p_verdict not in ('approve', 'reject', 'unsure') or coalesce(trim(p_reason), '') = '' then
    raise exception 'invalid_input';
  end if;
  perform 1 from public.submissions where id = p_id and status = 'new' for update;
  if not found then raise exception 'not_found'; end if;

  if p_verdict = 'approve' then
    if p_question is null then raise exception 'invalid_input'; end if;
    insert into public.question_pool(submission_id, position, text_ar, unit_ar, category, region, difficulty,
                                     answer, as_of, source_url, source_name, explanation_ar, notes_ar)
    values (p_id, (p_question->>'position')::smallint, p_question->>'text_ar', p_question->>'unit_ar',
            p_question->>'category', p_question->>'region', (p_question->>'difficulty')::smallint,
            (p_question->>'answer')::numeric, p_question->>'as_of', p_question->>'source_url',
            p_question->>'source_name', p_question->>'explanation_ar', p_question->>'notes_ar')
    returning id into v_pool;
  end if;

  update public.submissions
     set ai_verdict = p_verdict, ai_reason = left(p_reason, 2000), ai_reviewed_at = now(),
         status = case p_verdict when 'approve' then 'accepted' when 'reject' then 'rejected' else 'reviewing' end
   where id = p_id;
  return jsonb_build_object('id', p_id, 'verdict', p_verdict, 'pool_id', v_pool);
end $$;

-- Builds puzzles from the pool (oldest ready question per position) while fewer than 7 days are scheduled.
-- A new puzzle is dated no earlier than 3 days from today, so the admin email arrives before it goes live.
create function public.bot_fill_schedule(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_today date := private.qatar_day(now());
  v_out   jsonb := '[]'::jsonb;
  v_last  date;
  v_num   int;
  v_date  date;
  v_pid   int;
  v_qid   int;
  r       record;
  v_ids   bigint[];
begin
  perform private.require_bot(p_token);
  loop
    select max(publish_date), max(number) into v_last, v_num from public.puzzles;
    exit when v_last is not null and v_last >= v_today + 7;
    select array_agg(id order by position) into v_ids from (
      select distinct on (position) id, position from public.question_pool
       where status = 'ready' order by position, id) x;
    exit when coalesce(array_length(v_ids, 1), 0) < 3;

    v_date := greatest(coalesce(v_last, v_today) + 1, v_today + 3);
    insert into public.puzzles(number, publish_date, status) values (coalesce(v_num, 0) + 1, v_date, 'scheduled')
      returning id into v_pid;
    for r in select * from public.question_pool where id = any(v_ids) order by position loop
      insert into public.questions(puzzle_id, position, text_ar, unit_ar, category, region, difficulty)
        values (v_pid, r.position, r.text_ar, r.unit_ar, r.category, r.region, r.difficulty)
        returning id into v_qid;
      insert into public.question_answers(question_id, answer, as_of, source_url, source_name, explanation_ar)
        values (v_qid, r.answer, r.as_of, r.source_url, r.source_name, r.explanation_ar);
      update public.question_pool set status = 'used', question_id = v_qid where id = r.id;
      update public.submissions set status = 'scheduled' where id = r.submission_id;
    end loop;
    v_out := v_out || jsonb_build_object('number', coalesce(v_num, 0) + 1, 'publish_date', v_date);
  end loop;
  return v_out;
end $$;

-- Daily summary to every admin (same Resend sender as the feedback alerts).
create function public.bot_email_admins(p_token text, p_subject text, p_html text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.require_bot(p_token);
  perform private.email_admins(left(p_subject, 200), private.alert_wrap(private.html_escape(left(p_subject, 200)), p_html));
end $$;

-- The admin inbox now also shows the AI verdict and reason.
create or replace function public.admin_list_submissions(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(s) order by s.created_at desc)
      from (
        select sb.id, sb.text_ar, sb.unit_ar, sb.proposed_answer::float8 as proposed_answer, sb.source_url,
               sb.napkin_ar, sb.credit_name, sb.status, sb.created_at, pl.display_name,
               sb.ai_verdict, sb.ai_reason, sb.ai_reviewed_at
          from public.submissions sb
          left join public.players pl on pl.id = sb.player_id
         where p_status is null or sb.status = p_status
         order by sb.created_at desc
         limit 300
      ) s
  ), '[]'::jsonb);
end $$;

revoke execute on function
  public.bot_context(text),
  public.bot_record_review(text, bigint, text, text, jsonb),
  public.bot_fill_schedule(text),
  public.bot_email_admins(text, text, text)
from public;

-- The token check inside each function is the gate.
grant execute on function
  public.bot_context(text),
  public.bot_record_review(text, bigint, text, text, jsonb),
  public.bot_fill_schedule(text),
  public.bot_email_admins(text, text, text)
to anon, authenticated;
