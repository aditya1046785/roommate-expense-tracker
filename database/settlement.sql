create or replace function public.settle_unsettled_expenses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  roster_user_count integer;
  cents_total bigint;
  base_share bigint;
  remainder_cents bigint;
  transfer_cents bigint;
  creditor record;
  debtor record;
  creditor_remaining bigint;
  debtor_remaining bigint;
  current_transfer jsonb;
  transfers jsonb := '[]'::jsonb;
begin
  select count(*) into roster_user_count from public.users where role = 'user';
  if roster_user_count = 0 then
    return transfers;
  end if;

  select coalesce(sum(round(amount * 100)), 0)::bigint
    into cents_total
    from public.expenses as expenses
    join public.users as users on users.id = expenses.user_id
    where expenses.is_settled = false
      and users.role = 'user';
  if cents_total = 0 then
    return transfers;
  end if;

  base_share := cents_total / roster_user_count;
  remainder_cents := cents_total % roster_user_count;

  create temporary table if not exists settlement_balances (
    user_id uuid primary key,
    balance_cents bigint not null
  ) on commit drop;
  truncate settlement_balances;

  insert into settlement_balances (user_id, balance_cents)
  select id,
         -base_share - case when row_number() over (order by id) <= remainder_cents then 1 else 0 end
    from public.users
    where role = 'user'
    order by id;

  insert into settlement_balances (user_id, balance_cents)
  select distinct expenses.user_id, 0
    from public.expenses as expenses
    join public.users as users on users.id = expenses.user_id
    where expenses.is_settled = false
      and users.role = 'user'
      and not exists (
        select 1 from settlement_balances as balances where balances.user_id = expenses.user_id
      );

  update settlement_balances as balances
     set balance_cents = balances.balance_cents + expenses.spent_cents
    from (
      select user_id, sum(round(amount * 100))::bigint as spent_cents
        from public.expenses as expenses
        join public.users as users on users.id = expenses.user_id
        where expenses.is_settled = false
          and users.role = 'user'
        group by expenses.user_id
    ) as expenses
    where balances.user_id = expenses.user_id;

  for creditor in select user_id, balance_cents from settlement_balances where balance_cents > 0 order by user_id loop
    creditor_remaining := creditor.balance_cents;
    for debtor in select user_id from settlement_balances where balance_cents < 0 order by user_id loop
      select -balance_cents into debtor_remaining from settlement_balances where user_id = debtor.user_id;
      if creditor_remaining = 0 then exit; end if;
      if debtor_remaining = 0 then continue; end if;
      transfer_cents := least(creditor_remaining, debtor_remaining);
      current_transfer := jsonb_build_object(
        'fromUserId', debtor.user_id,
        'toUserId', creditor.user_id,
        'amount', transfer_cents::numeric / 100
      );
      transfers := transfers || jsonb_build_array(current_transfer);
      insert into public.settlement_transactions (from_user_id, to_user_id, amount)
      values (debtor.user_id, creditor.user_id, transfer_cents::numeric / 100);
      update settlement_balances set balance_cents = balance_cents + transfer_cents where user_id = debtor.user_id;
      creditor_remaining := creditor_remaining - transfer_cents;
    end loop;
  end loop;

  update public.expenses as expenses
     set is_settled = true
    from public.users as users
   where users.id = expenses.user_id
     and users.role = 'user'
     and expenses.is_settled = false;
  return transfers;
end;
$$;
