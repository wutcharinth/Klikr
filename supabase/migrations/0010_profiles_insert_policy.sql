-- Add missing INSERT policy on profiles so upserts from server actions work.
-- Without this, Supabase RLS blocks the upsert in completeOnboarding even
-- when the row already exists (Postgres requires INSERT permission for
-- ON CONFLICT DO UPDATE to be evaluated).

drop policy if exists "self insert profile" on profiles;
create policy "self insert profile" on profiles
  for insert with check (auth.uid() = id);
