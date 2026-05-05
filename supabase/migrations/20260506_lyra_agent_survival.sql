-- ─── lyra_agent_survival ─────────────────────────────────────────────────────
-- Singleton row for Lyra's persistent survival economics state.
-- Written by the agent process via service role key (no user session / RLS).

create table if not exists public.lyra_agent_survival (
  id                  text primary key default 'lyra',
  born_at             timestamptz not null,
  realized_pnl        numeric not null default 0,
  trades_opened       integer not null default 0,
  trades_closed       integer not null default 0,
  wins                integer not null default 0,
  losses              integer not null default 0,
  today_date          text,             -- YYYY-MM-DD UTC
  today_started_at    timestamptz,
  today_start_equity  numeric,
  updated_at          timestamptz not null default now()
);

-- No RLS — only accessible via service role key from the agent process.
