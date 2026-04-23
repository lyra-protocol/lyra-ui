-- Lyra MCP trading / execution layer (see docs/lyra-technical-spec.md).
-- Links to existing workspace_users; intended for server-side (service role) access.

create table if not exists public.lyra_mcp_api_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  token text not null unique,
  label text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lyra_mcp_api_tokens_workspace_user_id_idx
  on public.lyra_mcp_api_tokens (workspace_user_id, created_at desc);

create unique index if not exists lyra_mcp_api_tokens_one_active_per_user_idx
  on public.lyra_mcp_api_tokens (workspace_user_id)
  where revoked_at is null;

create table if not exists public.lyra_trading_rules (
  workspace_user_id uuid primary key references public.workspace_users(id) on delete cascade,
  strategy text not null default 'manual'
    check (strategy in ('whale-copy', 'sniper', 'dca', 'manual')),
  max_spend_day_sol numeric(24, 8),
  stop_loss_day_usd numeric(24, 8),
  max_per_trade_sol numeric(24, 8),
  allowed_tokens jsonb,
  max_slippage_bps integer,
  permission text not null default 'MANUAL'
    check (permission in ('MANUAL', 'AUTO_WITHIN_RULES')),
  updated_at timestamptz not null default now()
);

create or replace trigger lyra_trading_rules_set_updated_at
before update on public.lyra_trading_rules
for each row execute function public.set_updated_at();

create table if not exists public.lyra_execution_trades (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  mode text not null check (mode in ('paper', 'live')),
  trigger text not null check (trigger in ('manual', 'auto', 'claude')),
  token_in text not null,
  token_out text not null,
  amount_in numeric(24, 8) not null,
  amount_out numeric(24, 8),
  slippage_bps integer,
  tx_sig text,
  platform_fee_usd numeric(24, 8),
  pnl_usd numeric(24, 8),
  created_at timestamptz not null default now()
);

create index if not exists lyra_execution_trades_workspace_user_id_idx
  on public.lyra_execution_trades (workspace_user_id, created_at desc);

create table if not exists public.lyra_trading_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  type text not null,
  priority integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  actioned_at timestamptz
);

create index if not exists lyra_trading_signals_workspace_user_id_idx
  on public.lyra_trading_signals (workspace_user_id, created_at desc);

alter table public.lyra_mcp_api_tokens enable row level security;
alter table public.lyra_trading_rules enable row level security;
alter table public.lyra_execution_trades enable row level security;
alter table public.lyra_trading_signals enable row level security;
