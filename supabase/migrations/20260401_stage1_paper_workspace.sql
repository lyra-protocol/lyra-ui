create extension if not exists pgcrypto;

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text not null unique,
  wallet_address text,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null unique references public.workspace_users(id) on delete cascade,
  currency text not null default 'USDT',
  starting_balance numeric(20,8) not null default 10000,
  cash_balance numeric(20,8) not null default 10000,
  realized_pnl numeric(20,8) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  product_id text not null,
  symbol text not null,
  quantity numeric(20,8) not null,
  entry_price numeric(20,8) not null,
  last_trade_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_user_id, product_id)
);

create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  paper_account_id uuid not null references public.paper_accounts(id) on delete cascade,
  position_id uuid references public.paper_positions(id) on delete set null,
  product_id text not null,
  symbol text not null,
  side text not null check (side in ('buy', 'close')),
  quantity numeric(20,8) not null,
  price numeric(20,8) not null,
  notional numeric(20,8) not null,
  realized_pnl numeric(20,8) not null default 0,
  note text,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null references public.workspace_users(id) on delete cascade,
  type text not null,
  title text not null,
  detail text,
  product_id text,
  source text not null default 'workspace' check (source in ('workspace', 'record')),
  created_at timestamptz not null default now()
);

create index if not exists paper_positions_workspace_user_id_idx
  on public.paper_positions (workspace_user_id, updated_at desc);

create index if not exists paper_trades_workspace_user_id_idx
  on public.paper_trades (workspace_user_id, executed_at desc);

create index if not exists workspace_activity_workspace_user_id_idx
  on public.workspace_activity (workspace_user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger workspace_users_set_updated_at
before update on public.workspace_users
for each row execute function public.set_updated_at();

create or replace trigger paper_accounts_set_updated_at
before update on public.paper_accounts
for each row execute function public.set_updated_at();

create or replace trigger paper_positions_set_updated_at
before update on public.paper_positions
for each row execute function public.set_updated_at();

create or replace function public.lyra_paper_buy(
  p_privy_user_id text,
  p_product_id text,
  p_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user public.workspace_users;
  v_account public.paper_accounts;
  v_position public.paper_positions;
  v_trade public.paper_trades;
  v_activity public.workspace_activity;
  v_cost numeric;
  v_next_quantity numeric;
  v_next_entry numeric;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price must be greater than zero';
  end if;

  select * into v_user from public.workspace_users where privy_user_id = p_privy_user_id limit 1;
  if v_user.id is null then
    raise exception 'Workspace user not found';
  end if;

  select * into v_account from public.paper_accounts where workspace_user_id = v_user.id limit 1;
  if v_account.id is null then
    raise exception 'Paper account not found';
  end if;

  v_cost := p_quantity * p_price;
  if v_account.cash_balance < v_cost then
    raise exception 'Insufficient paper balance';
  end if;

  select * into v_position
  from public.paper_positions
  where workspace_user_id = v_user.id and product_id = p_product_id
  limit 1;

  if v_position.id is null then
    insert into public.paper_positions (
      workspace_user_id, product_id, symbol, quantity, entry_price, last_trade_at
    ) values (
      v_user.id, p_product_id, p_symbol, p_quantity, p_price, now()
    ) returning * into v_position;
  else
    v_next_quantity := v_position.quantity + p_quantity;
    v_next_entry := ((v_position.quantity * v_position.entry_price) + (p_quantity * p_price)) / v_next_quantity;

    update public.paper_positions
    set quantity = v_next_quantity,
        entry_price = v_next_entry,
        symbol = p_symbol,
        last_trade_at = now()
    where id = v_position.id
    returning * into v_position;
  end if;

  update public.paper_accounts
  set cash_balance = cash_balance - v_cost
  where id = v_account.id
  returning * into v_account;

  insert into public.paper_trades (
    workspace_user_id, paper_account_id, position_id, product_id, symbol,
    side, quantity, price, notional, realized_pnl, note, executed_at
  ) values (
    v_user.id, v_account.id, v_position.id, p_product_id, p_symbol,
    'buy', p_quantity, p_price, v_cost, 0, coalesce(p_note, 'Opened from Lyra workspace'), now()
  ) returning * into v_trade;

  insert into public.workspace_activity (
    workspace_user_id, type, title, detail, product_id, source
  ) values (
    v_user.id,
    'trade.opened',
    'Paper buy executed',
    concat(p_quantity::text, ' ', p_symbol, ' @ ', p_price::text),
    p_product_id,
    'workspace'
  ) returning * into v_activity;

  return jsonb_build_object(
    'account', to_jsonb(v_account),
    'position', to_jsonb(v_position),
    'trade', to_jsonb(v_trade),
    'activity', to_jsonb(v_activity)
  );
end;
$$;

create or replace function public.lyra_paper_close(
  p_privy_user_id text,
  p_product_id text,
  p_price numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user public.workspace_users;
  v_account public.paper_accounts;
  v_position public.paper_positions;
  v_trade public.paper_trades;
  v_activity public.workspace_activity;
  v_notional numeric;
  v_realized numeric;
begin
  if p_price is null or p_price <= 0 then
    raise exception 'Price must be greater than zero';
  end if;

  select * into v_user from public.workspace_users where privy_user_id = p_privy_user_id limit 1;
  if v_user.id is null then
    raise exception 'Workspace user not found';
  end if;

  select * into v_account from public.paper_accounts where workspace_user_id = v_user.id limit 1;
  if v_account.id is null then
    raise exception 'Paper account not found';
  end if;

  select * into v_position
  from public.paper_positions
  where workspace_user_id = v_user.id and product_id = p_product_id
  limit 1;

  if v_position.id is null then
    raise exception 'No open paper position for this market';
  end if;

  v_notional := v_position.quantity * p_price;
  v_realized := (p_price - v_position.entry_price) * v_position.quantity;

  update public.paper_accounts
  set cash_balance = cash_balance + v_notional,
      realized_pnl = realized_pnl + v_realized
  where id = v_account.id
  returning * into v_account;

  insert into public.paper_trades (
    workspace_user_id, paper_account_id, position_id, product_id, symbol,
    side, quantity, price, notional, realized_pnl, note, executed_at
  ) values (
    v_user.id, v_account.id, v_position.id, v_position.product_id, v_position.symbol,
    'close', v_position.quantity, p_price, v_notional, v_realized,
    coalesce(p_note, 'Closed from Lyra workspace'), now()
  ) returning * into v_trade;

  delete from public.paper_positions where id = v_position.id;

  insert into public.workspace_activity (
    workspace_user_id, type, title, detail, product_id, source
  ) values (
    v_user.id,
    'trade.closed',
    'Paper position closed',
    concat(v_position.quantity::text, ' ', v_position.symbol, ' @ ', p_price::text),
    v_position.product_id,
    'workspace'
  ) returning * into v_activity;

  return jsonb_build_object(
    'account', to_jsonb(v_account),
    'position', null,
    'trade', to_jsonb(v_trade),
    'activity', to_jsonb(v_activity)
  );
end;
$$;
