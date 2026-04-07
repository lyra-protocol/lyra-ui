do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_users'
    ) then
      alter publication supabase_realtime add table public.workspace_users;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'paper_accounts'
    ) then
      alter publication supabase_realtime add table public.paper_accounts;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'paper_positions'
    ) then
      alter publication supabase_realtime add table public.paper_positions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'paper_trades'
    ) then
      alter publication supabase_realtime add table public.paper_trades;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_activity'
    ) then
      alter publication supabase_realtime add table public.workspace_activity;
    end if;
  end if;
end
$$;
