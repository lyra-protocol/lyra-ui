alter table public.workspace_users
add column if not exists has_seen_paper_balance_banner boolean not null default false;
