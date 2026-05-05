-- ─── lyra_agent_lessons ──────────────────────────────────────────────────────
-- Lyra autonomous agent's persistent memory. Written by the agent process
-- directly using the service role key (no user session / RLS).

create table if not exists public.lyra_agent_lessons (
  id            text primary key,           -- "mem_<timestamp>_<random>"
  type          text not null,              -- lesson | pattern | insight | risk_note
  content       text not null,
  confidence    numeric(4, 3) not null default 0.5
    check (confidence >= 0 and confidence <= 1),
  symbol        text,                       -- BTC / ETH / SOL, nullable
  trade_outcome text                        -- win | loss | breakeven, nullable
    check (trade_outcome in ('win', 'loss', 'breakeven') or trade_outcome is null),
  created_at    timestamptz not null default now()
);

create index if not exists lyra_agent_lessons_created_at_idx
  on public.lyra_agent_lessons (created_at desc);

-- No RLS — only accessible via service role key from the agent process.
-- Do NOT enable row-level security on this table.
