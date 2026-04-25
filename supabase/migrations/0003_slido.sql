-- Slido-style features: qa + rating slide types, question upvotes, live reactions

alter table slides drop constraint if exists slides_type_check;
alter table slides add constraint slides_type_check
  check (type in ('mcq','wordcloud','open','quiz','qa','rating'));

-- Upvotes for Q&A questions. Each row in `responses` is a question; this table
-- tracks which participants upvoted which question.
create table if not exists question_votes (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (response_id, participant_id)
);
create index if not exists question_votes_response_idx on question_votes (response_id);

-- Live emoji reactions, slide-independent. Used for crowd reactions on the
-- presenter overlay.
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  participant_id uuid references participants(id) on delete set null,
  emoji text not null,
  created_at timestamptz not null default now()
);
create index if not exists reactions_pres_idx on reactions (presentation_id, created_at desc);

-- Realtime
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='question_votes') then
    alter publication supabase_realtime add table question_votes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='reactions') then
    alter publication supabase_realtime add table reactions;
  end if;
end $$;

-- RLS — open like the rest of v1
alter table question_votes enable row level security;
alter table reactions enable row level security;

drop policy if exists "anyone insert votes" on question_votes;
drop policy if exists "anyone select votes" on question_votes;
drop policy if exists "anyone delete votes" on question_votes;
create policy "anyone insert votes" on question_votes for insert with check (true);
create policy "anyone select votes" on question_votes for select using (true);
create policy "anyone delete votes" on question_votes for delete using (true);

drop policy if exists "anyone insert reactions" on reactions;
drop policy if exists "anyone select reactions" on reactions;
create policy "anyone insert reactions" on reactions for insert with check (true);
create policy "anyone select reactions" on reactions for select using (true);
