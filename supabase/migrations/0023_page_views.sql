-- Page-view event log for the admin analytics page.
-- Anonymous (audience) inserts are allowed since /play/* views are unauthed.

create table if not exists page_views (
  id bigserial primary key,
  path text not null,
  user_id uuid references auth.users(id) on delete set null,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_idx on page_views (created_at desc);
create index if not exists page_views_path_idx on page_views (path);

alter table page_views enable row level security;

-- Anyone can insert a view event (audience pages are public). We rely on the
-- application to scrub identifiers; user_id is only set when auth.uid() is
-- present, never spoofable from the client.
create policy "page_views insert"
  on page_views for insert
  with check (
    (user_id is null) or (user_id = auth.uid())
  );

-- No SELECT policy — admin reads via service role.
