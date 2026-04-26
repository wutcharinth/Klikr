-- Plans, profiles, themes, AI cache tables.

-- profiles: per-user plan tier + onboarding state + admin flag
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan_tier text not null default 'pro' check (plan_tier in ('free','basic','pro','enterprise')),
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-seed a profile on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill profiles for existing users
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table profiles enable row level security;
drop policy if exists "self read profile" on profiles;
drop policy if exists "self update profile" on profiles;
create policy "self read profile" on profiles for select using (auth.uid() = id);
create policy "self update profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Presentation theme + template linkage
alter table presentations add column if not exists theme jsonb not null default '{}'::jsonb;
alter table presentations add column if not exists is_template boolean not null default false;
alter table presentations add column if not exists source_template_id uuid;

-- Embed slide type + Kahoot mode flag
alter table slides drop constraint if exists slides_type_check;
alter table slides add constraint slides_type_check
  check (type in ('mcq','wordcloud','open','quiz','qa','rating','embed'));
alter table slides add column if not exists kahoot_mode boolean not null default false;

-- AI summary cache (one row per slide)
create table if not exists slide_ai_summaries (
  slide_id uuid primary key references slides(id) on delete cascade,
  summary jsonb,
  cluster_data jsonb,
  last_response_count int not null default 0,
  generated_at timestamptz not null default now()
);
alter table slide_ai_summaries enable row level security;
drop policy if exists "owners read summaries" on slide_ai_summaries;
drop policy if exists "owners write summaries" on slide_ai_summaries;
create policy "owners read summaries" on slide_ai_summaries for select using (
  exists (
    select 1 from slides s join presentations p on p.id = s.presentation_id
    where s.id = slide_ai_summaries.slide_id and p.owner_id = auth.uid()
  )
);
create policy "owners write summaries" on slide_ai_summaries for all using (
  exists (
    select 1 from slides s join presentations p on p.id = s.presentation_id
    where s.id = slide_ai_summaries.slide_id and p.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from slides s join presentations p on p.id = s.presentation_id
    where s.id = slide_ai_summaries.slide_id and p.owner_id = auth.uid()
  )
);

-- AI usage log (admin-only viewable)
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  usd_estimate numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created_idx on ai_usage (created_at desc);
alter table ai_usage enable row level security;
drop policy if exists "admins read ai_usage" on ai_usage;
drop policy if exists "service write ai_usage" on ai_usage;
create policy "admins read ai_usage" on ai_usage for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "service write ai_usage" on ai_usage for insert with check (true);
