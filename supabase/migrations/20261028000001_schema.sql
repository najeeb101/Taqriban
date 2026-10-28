-- Taqriban: schema, private helpers, triggers.
-- All client access goes through security-definer RPCs (later migrations). RLS is on for every table with no policies.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ------------------------------------------------------------------ tables
create table public.players (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default ('لاعب ' || (1000 + floor(random() * 9000))::int),
  university   text,
  digit_style  text not null default 'latn' check (digit_style in ('latn', 'arab')),
  created_at   timestamptz not null default now()
);

create table public.puzzles (
  id           serial primary key,
  number       int  not null unique,
  publish_date date not null unique,
  status       text not null default 'scheduled' check (status in ('draft', 'scheduled', 'live', 'archived'))
);

create table public.questions (
  id         serial primary key,
  puzzle_id  int      not null references public.puzzles(id) on delete cascade,
  position   smallint not null check (position between 1 and 3),
  text_ar    text     not null,
  unit_ar    text     not null,
  category   text,
  region     text,
  difficulty smallint check (difficulty between 1 and 5),
  unique (puzzle_id, position)
);

create table public.question_answers (
  question_id    int primary key references public.questions(id) on delete cascade,
  answer         numeric not null check (answer > 0),
  as_of          text,
  source_url     text not null,
  source_name    text,
  explanation_ar text not null
);

create table public.guesses (
  id          bigserial primary key,
  player_id   uuid    not null references public.players(id) on delete cascade,
  question_id int     not null references public.questions(id) on delete cascade,
  guess       numeric not null check (guess > 0),
  multiple    numeric not null check (multiple >= 1),   -- filled by trigger
  direction   text    not null check (direction in ('low', 'high', 'exact')), -- filled by trigger
  bin         smallint not null,                          -- filled by trigger
  is_daily    boolean not null,
  created_at  timestamptz not null default now(),
  unique (player_id, question_id)
);
create index guesses_question_multiple_idx on public.guesses (question_id, multiple);

create table public.daily_results (
  player_id    uuid    not null references public.players(id) on delete cascade,
  puzzle_id    int     not null references public.puzzles(id) on delete cascade,
  score        numeric not null check (score >= 1),
  is_daily     boolean not null,
  completed_at timestamptz not null default now(),
  primary key (player_id, puzzle_id)
);
create index daily_results_board_idx on public.daily_results (puzzle_id, score, completed_at) where is_daily;

create table public.question_histogram (
  question_id int      not null references public.questions(id) on delete cascade,
  bin         smallint not null,
  count       int      not null default 0,
  primary key (question_id, bin)
);

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null default 'friends' check (kind in ('friends', 'class', 'club', 'university')),
  join_code  text not null unique,
  owner_id   uuid not null references public.players(id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
create index group_members_player_idx on public.group_members (player_id);

create table public.submissions (
  id              bigserial primary key,
  player_id       uuid references public.players(id) on delete set null,
  text_ar         text not null,
  unit_ar         text,
  proposed_answer numeric,
  source_url      text,
  napkin_ar       text,
  credit_name     text,
  status          text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'rejected', 'scheduled')),
  created_at      timestamptz not null default now()
);

create table public.rate_events (
  id        bigserial primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  action    text not null,
  at        timestamptz not null default now()
);
create index rate_events_idx on public.rate_events (player_id, action, at);

alter table public.players            enable row level security;
alter table public.puzzles            enable row level security;
alter table public.questions          enable row level security;
alter table public.question_answers   enable row level security;
alter table public.guesses            enable row level security;
alter table public.daily_results      enable row level security;
alter table public.question_histogram enable row level security;
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;
alter table public.submissions        enable row level security;
alter table public.rate_events        enable row level security;
-- No policies for anon/authenticated: direct table access is denied.

-- ------------------------------------------------------------------ private helpers
create function private.qatar_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Qatar')::date $$;

-- Raises rate_limited when the caller already did p_max actions within p_window; otherwise records one.
create function private.check_rate(p_player uuid, p_action text, p_max int, p_window interval) returns void
language plpgsql as $$
declare v_n int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_player::text || ':' || p_action, 0));
  delete from public.rate_events where player_id = p_player and at < now() - interval '2 days';
  select count(*) into v_n from public.rate_events
   where player_id = p_player and action = p_action and at > now() - p_window;
  if v_n >= p_max then raise exception 'rate_limited'; end if;
  insert into public.rate_events(player_id, action) values (p_player, p_action);
end $$;

-- Mirrors lib/sanitize.ts: strip control / bidi / zero-width chars, collapse spaces, trim.
create function private.sanitize_name(p_raw text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(p_raw, ''), '[\t\n\r]', ' ', 'g'),
      '[\u0001-\u001f\u007f-\u009f؜​-‏‪-‮⁠-⁩﻿]', '', 'g'),
    '\s+', ' ', 'g'))
$$;

create function private.is_profane(p_text text) returns boolean
language plpgsql immutable as $$
declare
  v_norm text;
  v_word text;
  v_words text[] := array[
    'fuck','shit','bitch','asshole','cunt','nigger','nigga','whore','slut','porn','faggot',
    'شرموط','قحبه','منيك','متناك','عرص','كسمك','كساميك','كسامك','كسختك','كسأمك','ابنالكلب','ابنالقحبه'
  ];
begin
  v_norm := lower(coalesce(p_text, ''));
  v_norm := regexp_replace(v_norm, '[ً-ٟـ]', '', 'g');
  v_norm := translate(v_norm, 'أإآةى', 'اااهي');
  v_norm := regexp_replace(v_norm, '[^[:alpha:]]', '', 'g');
  foreach v_word in array v_words loop
    if position(v_word in v_norm) > 0 then return true; end if;
  end loop;
  return false;
end $$;

-- Validates and returns the clean name, or raises invalid_name.
create function private.clean_name(p_raw text, p_min int default 2, p_max int default 24) returns text
language plpgsql immutable as $$
declare v text := private.sanitize_name(p_raw);
begin
  if char_length(v) < p_min or char_length(v) > p_max or private.is_profane(v) then
    raise exception 'invalid_name';
  end if;
  return v;
end $$;

create function private.valid_university(p_code text) returns boolean
language sql immutable as $$
  select p_code = any (array['qu','hbku','tamuq','cmuq','gu-q','nu-q','wcm-q','vcuarts-q','udst','dohainstitute','lusail','other'])
$$;

-- Authenticated caller id (raises not_authenticated) and makes sure the players row exists.
create function private.ensure_player() returns uuid
language plpgsql as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not_authenticated'; end if;
  insert into public.players(id) values (v) on conflict (id) do nothing;
  return v;
end $$;

-- Puzzle is live when not a draft and its date has arrived (Asia/Qatar).
create function private.puzzle_is_live(p_puzzle_id int) returns boolean
language sql stable as $$
  select exists (select 1 from public.puzzles p
                  where p.id = p_puzzle_id and p.status <> 'draft' and p.publish_date <= private.qatar_today())
$$;

-- round half away from zero on numeric, clamped.
create function private.guess_bin(p_guess numeric, p_answer numeric) returns smallint
language sql immutable as $$
  select greatest(-12, least(12, round(log(p_guess / p_answer) * 4)))::smallint
$$;

create function private.score_bin(p_score numeric) returns int
language sql immutable as $$
  select greatest(0, least(12, round(log(p_score) * 4)))::int
$$;

-- Current / best streak per player (consecutive puzzle numbers with an is_daily result).
create function private.player_streaks(p_players uuid[] default null)
returns table (player_id uuid, current_streak int, best_streak int)
language sql stable as $$
  with cur as (
    select number as n from public.puzzles
     where status <> 'draft' and publish_date <= private.qatar_today()
     order by publish_date desc limit 1
  ),
  r as (
    select dr.player_id, p.number as n
      from public.daily_results dr
      join public.puzzles p on p.id = dr.puzzle_id
     where dr.is_daily and p.status <> 'draft'
       and (p_players is null or dr.player_id = any (p_players))
  ),
  g as (select r.player_id, r.n, r.n - row_number() over (partition by r.player_id order by r.n) as grp from r),
  isl as (select g.player_id, count(*)::int as len, max(g.n) as last_n from g group by g.player_id, g.grp)
  select i.player_id,
         coalesce(max(i.len) filter (where i.last_n between (select n from cur) - 1 and (select n from cur)), 0)::int,
         max(i.len)::int
    from isl i
   group by i.player_id
$$;

-- Calibration view (service-role only, via admin_stats()).
create view private.question_stats as
select p.number as puzzle_number,
       q.position,
       q.id as question_id,
       q.text_ar,
       count(g.id)::int as players,
       (percentile_cont(0.5) within group (order by g.multiple))::float8 as median_multiple,
       (100.0 * count(*) filter (where g.direction = 'low') / nullif(count(g.id), 0))::float8 as pct_low,
       (100.0 * count(*) filter (where g.direction = 'high') / nullif(count(g.id), 0))::float8 as pct_high
  from public.questions q
  join public.puzzles p on p.id = q.puzzle_id
  left join public.guesses g on g.question_id = q.id
 group by p.number, q.position, q.id, q.text_ar;

-- ------------------------------------------------------------------ triggers
-- New auth user -> players row (default name comes from the column default).
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.players(id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Guess: compute multiple / direction / bin from the answer (single source of truth) and keep the histogram in sync.
create function private.guess_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_answer numeric;
begin
  select answer into v_answer from public.question_answers where question_id = new.question_id;
  if v_answer is null then raise exception 'unknown_question'; end if;
  new.multiple  := greatest(new.guess / v_answer, v_answer / new.guess);
  new.direction := case when new.guess = v_answer then 'exact' when new.guess < v_answer then 'low' else 'high' end;
  new.bin       := private.guess_bin(new.guess, v_answer);
  return new;
end $$;

create trigger guesses_before_insert before insert on public.guesses
  for each row execute function private.guess_before_insert();

create function private.guess_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.question_histogram(question_id, bin, count) values (new.question_id, new.bin, 1)
  on conflict (question_id, bin) do update set count = public.question_histogram.count + 1;
  return null;
end $$;

create trigger guesses_after_insert after insert on public.guesses
  for each row execute function private.guess_after_insert();

create function private.guess_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.question_histogram set count = greatest(count - 1, 0)
   where question_id = old.question_id and bin = old.bin;
  return null;
end $$;

create trigger guesses_after_delete after delete on public.guesses
  for each row execute function private.guess_after_delete();

-- Deleting a player: hand their groups to the oldest other member, or delete groups with nobody else.
create function private.player_before_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare g record; v_next uuid;
begin
  for g in select id from public.groups where owner_id = old.id loop
    select player_id into v_next from public.group_members
     where group_id = g.id and player_id <> old.id order by joined_at, player_id limit 1;
    if v_next is null then
      delete from public.groups where id = g.id;
    else
      update public.groups set owner_id = v_next where id = g.id;
    end if;
  end loop;
  return old;
end $$;

create trigger players_before_delete before delete on public.players
  for each row execute function private.player_before_delete();
