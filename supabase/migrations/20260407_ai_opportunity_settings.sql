alter table public.workspace_users
add column if not exists ai_opportunity_alerts_enabled boolean not null default true,
add column if not exists ai_opportunity_min_confidence integer not null default 82,
add column if not exists ai_opportunity_min_score numeric(6,2) not null default 11.50,
add column if not exists ai_opportunity_min_rr numeric(6,2) not null default 1.60,
add column if not exists ai_opportunity_max_entry_distance_pct numeric(6,2) not null default 0.85,
add column if not exists ai_opportunity_max_alerts_per_scan integer not null default 1;

alter table public.workspace_users
  drop constraint if exists workspace_users_ai_opportunity_min_confidence_check,
  add constraint workspace_users_ai_opportunity_min_confidence_check
    check (ai_opportunity_min_confidence between 60 and 95),
  drop constraint if exists workspace_users_ai_opportunity_min_score_check,
  add constraint workspace_users_ai_opportunity_min_score_check
    check (ai_opportunity_min_score between 6 and 20),
  drop constraint if exists workspace_users_ai_opportunity_min_rr_check,
  add constraint workspace_users_ai_opportunity_min_rr_check
    check (ai_opportunity_min_rr between 1 and 5),
  drop constraint if exists workspace_users_ai_opportunity_max_entry_distance_pct_check,
  add constraint workspace_users_ai_opportunity_max_entry_distance_pct_check
    check (ai_opportunity_max_entry_distance_pct between 0.2 and 4),
  drop constraint if exists workspace_users_ai_opportunity_max_alerts_per_scan_check,
  add constraint workspace_users_ai_opportunity_max_alerts_per_scan_check
    check (ai_opportunity_max_alerts_per_scan between 1 and 3);
