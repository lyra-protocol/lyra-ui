alter table if exists public.ai_threads
  drop constraint if exists ai_threads_workspace_user_id_workspace_id_key;

alter table if exists public.ai_threads
  add column if not exists title text not null default 'New thread',
  add column if not exists title_source text not null default 'system',
  add column if not exists last_message_preview text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_threads'
      and column_name = 'title_source'
  ) then
    alter table public.ai_threads
      drop constraint if exists ai_threads_title_source_check;

    alter table public.ai_threads
      add constraint ai_threads_title_source_check
      check (title_source in ('system', 'ai', 'user'));
  end if;
end $$;

create index if not exists ai_threads_workspace_user_id_updated_at_idx
  on public.ai_threads (workspace_user_id, updated_at desc);
