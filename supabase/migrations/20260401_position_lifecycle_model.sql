do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'paper_trades'
      and column_name = 'side'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'paper_trades'
      and column_name = 'action'
  ) then
    alter table public.paper_trades rename column side to action;
  end if;
end
$$;

alter table public.paper_trades drop constraint if exists paper_trades_side_check;
alter table public.paper_trades drop constraint if exists paper_trades_action_check;

update public.paper_trades
set action = 'open'
where action = 'buy';

alter table public.paper_trades
add constraint paper_trades_action_check
check (action in ('open', 'increase', 'close'));

create or replace function public.lyra_open_or_increase_paper_position(
  p_privy_user_id text,
  p_product_id text,
  p_symbol text,
  p_notional numeric,
  p_price numeric,
  p_expected_action text,
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
  v_quantity numeric;
  v_next_quantity numeric;
  v_next_entry numeric;
  v_action text;
  v_title text;
  v_type text;
  v_detail text;
begin
  if p_expected_action not in ('open', 'increase') then
    raise exception 'Invalid position action';
  end if;

  if p_notional is null or p_notional <= 0 then
    raise exception 'Notional must be greater than zero';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price must be greater than zero';
  end if;

  v_quantity := p_notional / p_price;
  if v_quantity <= 0 then
    raise exception 'Position size must be greater than zero';
  end if;

  select * into v_user from public.workspace_users where privy_user_id = p_privy_user_id limit 1;
  if v_user.id is null then
    raise exception 'Workspace user not found';
  end if;

  select * into v_account from public.paper_accounts where workspace_user_id = v_user.id limit 1;
  if v_account.id is null then
    raise exception 'Paper account not found';
  end if;

  if v_account.cash_balance < p_notional then
    raise exception 'Insufficient paper balance';
  end if;

  select * into v_position
  from public.paper_positions
  where workspace_user_id = v_user.id and product_id = p_product_id
  limit 1;

  if v_position.id is null then
    if p_expected_action = 'increase' then
      raise exception 'No open position to increase';
    end if;

    insert into public.paper_positions (
      workspace_user_id, product_id, symbol, quantity, entry_price, last_trade_at
    ) values (
      v_user.id, p_product_id, p_symbol, v_quantity, p_price, now()
    ) returning * into v_position;

    v_action := 'open';
    v_title := 'Paper position opened';
    v_type := 'position.opened';
  else
    if p_expected_action = 'open' then
      raise exception 'Position already exists for this market';
    end if;

    v_next_quantity := v_position.quantity + v_quantity;
    v_next_entry := ((v_position.quantity * v_position.entry_price) + (v_quantity * p_price)) / v_next_quantity;

    update public.paper_positions
    set quantity = v_next_quantity,
        entry_price = v_next_entry,
        symbol = p_symbol,
        last_trade_at = now()
    where id = v_position.id
    returning * into v_position;

    v_action := 'increase';
    v_title := 'Paper position increased';
    v_type := 'position.increased';
  end if;

  update public.paper_accounts
  set cash_balance = cash_balance - p_notional
  where id = v_account.id
  returning * into v_account;

  insert into public.paper_trades (
    workspace_user_id, paper_account_id, position_id, product_id, symbol,
    action, quantity, price, notional, realized_pnl, note, executed_at
  ) values (
    v_user.id, v_account.id, v_position.id, p_product_id, p_symbol,
    v_action, v_quantity, p_price, p_notional, 0,
    coalesce(p_note, case when v_action = 'open' then 'Opened from Lyra workspace' else 'Increased from Lyra workspace' end),
    now()
  ) returning * into v_trade;

  v_detail := concat(v_quantity::text, ' ', p_symbol, ' @ ', p_price::text);

  insert into public.workspace_activity (
    workspace_user_id, type, title, detail, product_id, source
  ) values (
    v_user.id,
    v_type,
    v_title,
    v_detail,
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

create or replace function public.lyra_close_paper_position(
  p_privy_user_id text,
  p_product_id text,
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
  v_notional numeric;
  v_realized numeric;
  v_remaining numeric;
  v_title text;
  v_type text;
  v_detail text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Close size must be greater than zero';
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

  select * into v_position
  from public.paper_positions
  where workspace_user_id = v_user.id and product_id = p_product_id
  limit 1;

  if v_position.id is null then
    raise exception 'No open paper position for this market';
  end if;

  if p_quantity > v_position.quantity then
    raise exception 'Close size exceeds current position';
  end if;

  v_notional := p_quantity * p_price;
  v_realized := (p_price - v_position.entry_price) * p_quantity;
  v_remaining := v_position.quantity - p_quantity;

  update public.paper_accounts
  set cash_balance = cash_balance + v_notional,
      realized_pnl = realized_pnl + v_realized
  where id = v_account.id
  returning * into v_account;

  if v_remaining <= 0 then
    v_title := 'Paper position closed';
    v_type := 'position.closed';

    insert into public.paper_trades (
      workspace_user_id, paper_account_id, position_id, product_id, symbol,
      action, quantity, price, notional, realized_pnl, note, executed_at
    ) values (
      v_user.id, v_account.id, v_position.id, v_position.product_id, v_position.symbol,
      'close', p_quantity, p_price, v_notional, v_realized,
      coalesce(p_note, 'Closed from Lyra workspace'), now()
    ) returning * into v_trade;

    delete from public.paper_positions where id = v_position.id;
    v_position := null;
  else
    v_title := 'Paper position reduced';
    v_type := 'position.reduced';

    insert into public.paper_trades (
      workspace_user_id, paper_account_id, position_id, product_id, symbol,
      action, quantity, price, notional, realized_pnl, note, executed_at
    ) values (
      v_user.id, v_account.id, v_position.id, v_position.product_id, v_position.symbol,
      'close', p_quantity, p_price, v_notional, v_realized,
      coalesce(p_note, 'Reduced from Lyra workspace'), now()
    ) returning * into v_trade;

    update public.paper_positions
    set quantity = v_remaining,
        last_trade_at = now()
    where id = v_position.id
    returning * into v_position;
  end if;

  v_detail := concat(p_quantity::text, ' ', v_trade.symbol, ' @ ', p_price::text);

  insert into public.workspace_activity (
    workspace_user_id, type, title, detail, product_id, source
  ) values (
    v_user.id,
    v_type,
    v_title,
    v_detail,
    v_trade.product_id,
    'workspace'
  ) returning * into v_activity;

  return jsonb_build_object(
    'account', to_jsonb(v_account),
    'position', case when v_position is null then null else to_jsonb(v_position) end,
    'trade', to_jsonb(v_trade),
    'activity', to_jsonb(v_activity)
  );
end;
$$;
