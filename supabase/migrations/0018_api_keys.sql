-- API keys for the public REST API.
-- Owner mints a key in /dashboard/api-keys; all v1 calls authenticate via
-- `Authorization: Bearer klikr_pk_<token>`. We store sha256(token), never the
-- plaintext, so a leaked DB row cannot be used to call the API.

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Untitled key',
  key_hash text not null unique,
  prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on api_keys (user_id);
create index on api_keys (key_hash) where revoked_at is null;

alter table api_keys enable row level security;

-- The owner can read their own keys (for the dashboard page). Inserts/updates/
-- deletes always go through server-side actions that use the service role, so
-- we don't need write policies here.
create policy "owners can read their own keys"
  on api_keys for select
  using (auth.uid() = user_id);
