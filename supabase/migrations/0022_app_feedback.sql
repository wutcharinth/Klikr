-- App-level feedback inbox: hosts (and later audience) leave a 1–5 rating
-- and optional comment so the developer can see what's working and what's not.

create table if not exists app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  persona text not null check (persona in ('host','audience','admin')) default 'host',
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  page_path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_idx on app_feedback (created_at desc);
create index if not exists app_feedback_user_idx on app_feedback (user_id);

alter table app_feedback enable row level security;

-- Logged-in users can insert their own feedback. Anonymous (audience) inserts
-- write null user_id; we accept that for now since the widget is host-only.
create policy "feedback insert by authed user"
  on app_feedback for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

-- No SELECT policy for non-admins — they don't read other people's feedback.
-- Admin reads happen server-side via the service role on /admin.
