-- Groups: creating or joining needs an account (email linked, not anonymous).
-- Guests get account_required. Uses private.has_account from 20261030000002.

create or replace function public.create_group(p_name text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_name text;
  v_id uuid;
  v_code text;
begin
  if not private.has_account(v_player) then raise exception 'account_required'; end if;
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

create or replace function public.join_group(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid := private.ensure_player();
  v_id uuid;
begin
  if not private.has_account(v_player) then raise exception 'account_required'; end if;
  perform private.check_rate(v_player, 'join_group', 30, interval '1 hour');
  select id into v_id from public.groups where join_code = private.norm_code(p_code);
  if v_id is null then raise exception 'invalid_code'; end if;
  insert into public.group_members(group_id, player_id) values (v_id, v_player) on conflict do nothing;
  return private.group_summary(v_id, v_player);
end $$;
