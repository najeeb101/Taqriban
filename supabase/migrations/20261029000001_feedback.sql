-- Player feedback about the game itself (ideas, bugs, likes). Read it in Supabase Studio: Table Editor -> feedback.
create table public.feedback (
  id         bigserial primary key,
  player_id  uuid references public.players(id) on delete set null,
  kind       text not null check (kind in ('idea', 'bug', 'like', 'other')),
  rating     smallint check (rating between 1 and 5),
  message    text not null,
  contact    text,
  status     text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
-- No policies for anon/authenticated: direct table access is denied (same as every other table).
revoke all on table public.feedback from anon, authenticated;
revoke all on sequence public.feedback_id_seq from anon, authenticated;

create function public.submit_feedback(
  p_kind text, p_message text, p_rating int default null, p_contact text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_message text := btrim(coalesce(p_message, ''));
  v_id bigint;
begin
  if p_kind is null or p_kind not in ('idea', 'bug', 'like', 'other') then raise exception 'invalid_input'; end if;
  if char_length(v_message) < 5 or char_length(v_message) > 2000 then raise exception 'invalid_input'; end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then raise exception 'invalid_input'; end if;
  if char_length(coalesce(p_contact, '')) > 120 then raise exception 'invalid_input'; end if;
  perform private.check_rate(v_player, 'submit_feedback', 10, interval '1 day');

  insert into public.feedback(player_id, kind, rating, message, contact)
  values (v_player, p_kind, p_rating, v_message, nullif(btrim(coalesce(p_contact, '')), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

revoke execute on function public.submit_feedback(text, text, int, text) from public, anon;
grant execute on function public.submit_feedback(text, text, int, text) to authenticated;
