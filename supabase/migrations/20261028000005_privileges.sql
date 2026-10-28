-- Lock everything down; expose only the RPCs to signed-in (incl. anonymous) users.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function
  public.get_puzzle(int),
  public.submit_guess(int, numeric),
  public.get_histogram(int),
  public.get_results(int),
  public.get_leaderboard(text, uuid, text),
  public.create_group(text, text),
  public.join_group(text),
  public.leave_group(uuid),
  public.get_my_groups(),
  public.get_group(text),
  public.rename_group(uuid, text),
  public.remove_member(uuid, uuid),
  public.regenerate_code(uuid),
  public.get_profile(),
  public.update_profile(text, text, text),
  public.get_archive(),
  public.submit_question(text, text, numeric, text, text, text),
  public.delete_my_data()
to authenticated;

grant execute on function public.admin_stats() to service_role;
