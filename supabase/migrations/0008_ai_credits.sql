-- AI credit system. Each user has a balance of credits. Monthly grants based
-- on plan tier. Optional top-up purchases. Each AI feature consumes credits
-- (cost varies by route). While FREE_FOR_ALL is on, the helper short-circuits.

alter table profiles add column if not exists ai_credits_remaining int not null default 0;
alter table profiles add column if not exists ai_credits_period_start timestamptz;

-- Monthly grants: free=0, basic=10, pro=200. Idempotent within a calendar month.
create or replace function ai_grant_monthly_credits(p_user_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_tier text;
  v_quota int;
  v_period timestamptz;
  v_now timestamptz := now();
  v_month_start timestamptz := date_trunc('month', v_now);
begin
  select plan_tier, ai_credits_period_start
    into v_tier, v_period
    from profiles where id = p_user_id;

  if v_tier is null then
    insert into profiles (id) values (p_user_id) on conflict (id) do nothing;
    v_tier := 'pro';
  end if;

  v_quota := case v_tier
    when 'free' then 0
    when 'basic' then 10
    when 'pro' then 200
    else 200
  end;

  if v_period is null or v_period < v_month_start then
    update profiles
      set ai_credits_remaining = greatest(ai_credits_remaining, 0) + v_quota,
          ai_credits_period_start = v_now
      where id = p_user_id;
  end if;

  return (select ai_credits_remaining from profiles where id = p_user_id);
end $$;

-- Atomic decrement; returns new balance, or -1 if insufficient.
create or replace function ai_consume_credits(p_user_id uuid, p_amount int)
returns int
language plpgsql security definer as $$
declare
  v_new int;
begin
  update profiles
    set ai_credits_remaining = ai_credits_remaining - p_amount
    where id = p_user_id and ai_credits_remaining >= p_amount
    returning ai_credits_remaining into v_new;
  if v_new is null then
    return -1;
  end if;
  return v_new;
end $$;

-- Top-up purchases (Stripe integration deferred — for now we record manual grants only)
create table if not exists ai_credit_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits int not null,
  usd_paid numeric(10,2) not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
alter table ai_credit_topups enable row level security;
drop policy if exists "self read topups" on ai_credit_topups;
create policy "self read topups" on ai_credit_topups for select using (auth.uid() = user_id);

-- Track credits consumed in ai_usage for the admin meter.
alter table ai_usage add column if not exists credits_consumed int not null default 0;
