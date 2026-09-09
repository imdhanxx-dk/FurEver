-- These functions are trigger-only; browser roles must not invoke them directly.
alter function public.append_only_guard() set search_path = '';
revoke execute on function public.append_only_guard() from public, anon, authenticated;

-- Supabase provisions this event-trigger helper on hosted databases.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
