-- Klikr schema

create extension if not exists "pgcrypto";

create table presentations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  code text not null unique,
  current_slide_id uuid,
  state text not null default 'lobby' check (state in ('lobby','active','closed')),
  current_slide_started_at timestamptz,
  created_at timestamptz not null default now()
);
create index on presentations (owner_id);
create index on presentations (code);

create table slides (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  position int not null,
  type text not null check (type in ('mcq','wordcloud','open','quiz')),
  question text not null default '',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on slides (presentation_id, position);

alter table presentations
  add constraint presentations_current_slide_fkey
  foreign key (current_slide_id) references slides(id) on delete set null;

create table participants (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  nickname text not null,
  score int not null default 0,
  created_at timestamptz not null default now()
);
create index on participants (presentation_id);

create table responses (
  id uuid primary key default gen_random_uuid(),
  slide_id uuid not null references slides(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  value_text text,
  value_index int,
  response_ms int,
  created_at timestamptz not null default now(),
  unique (slide_id, participant_id)
);
create index on responses (slide_id);

-- Realtime publication
alter publication supabase_realtime add table presentations;
alter publication supabase_realtime add table responses;
alter publication supabase_realtime add table participants;

-- RLS
alter table presentations enable row level security;
alter table slides         enable row level security;
alter table participants   enable row level security;
alter table responses      enable row level security;

-- presentations: owner full CRUD; anyone can read (for code lookup + audience view)
create policy "owners manage presentations"
  on presentations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "public read presentations"
  on presentations for select
  using (true);

-- slides: owner full CRUD; anyone can read for non-closed presentations
create policy "owners manage slides"
  on slides for all
  using (
    exists (select 1 from presentations p where p.id = slides.presentation_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from presentations p where p.id = slides.presentation_id and p.owner_id = auth.uid())
  );

create policy "public read slides for active presentations"
  on slides for select
  using (
    exists (select 1 from presentations p where p.id = slides.presentation_id and p.state <> 'closed')
  );

-- participants: anyone can insert/select/update (anonymous audience)
create policy "anyone insert participants"
  on participants for insert
  with check (true);

create policy "anyone select participants"
  on participants for select
  using (true);

create policy "anyone update participants"
  on participants for update
  using (true)
  with check (true);

-- responses: anyone can insert/update/select (RLS open; owner-only views handled at query layer)
create policy "anyone insert responses"
  on responses for insert
  with check (true);

create policy "anyone select responses"
  on responses for select
  using (true);

create policy "anyone update responses"
  on responses for update
  using (true)
  with check (true);
