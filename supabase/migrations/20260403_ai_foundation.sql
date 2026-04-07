create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  workspace_id text not null default 'default',
  active_product_id text not null,
  active_timeframe text not null,
  last_response_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_user_id, workspace_id)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_name text,
  tool_call_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  product_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  context_packet jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create index if not exists ai_messages_thread_id_idx
  on public.ai_messages (thread_id, created_at asc);

create index if not exists ai_alerts_workspace_user_id_idx
  on public.ai_alerts (workspace_user_id, created_at desc);

create or replace trigger ai_threads_set_updated_at
before update on public.ai_threads
for each row execute function public.set_updated_at();
