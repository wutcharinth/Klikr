-- Audit hardening: lock anonymous writes behind trusted server actions,
-- scope owner/editor reads, and make quiz scoring idempotent.

alter table participants add column if not exists participant_token text;
update participants
  set participant_token = encode(gen_random_bytes(32), 'hex')
  where participant_token is null;
alter table participants
  alter column participant_token set default encode(gen_random_bytes(32), 'hex'),
  alter column participant_token set not null;
create unique index if not exists participants_token_idx on participants (participant_token);

alter view if exists editable_presentations set (security_invoker = true);

-- Public decks are only needed while joinable. Authenticated owner/editor access
-- remains covered by the owner/editor policies.
drop policy if exists "public read presentations" on presentations;
create policy "public read joinable presentations"
  on presentations for select
  using (state <> 'closed');

drop policy if exists "editors read presentations" on presentations;
create policy "editors read presentations"
  on presentations for select
  using (
    exists (
      select 1 from presentation_editors e
      where e.presentation_id = presentations.id and e.user_id = auth.uid()
    )
  );

drop policy if exists "anyone insert participants" on participants;
drop policy if exists "anyone select participants" on participants;
drop policy if exists "anyone update participants" on participants;

create policy "owners and editors read participants"
  on participants for select
  using (
    exists (
      select 1 from presentations p
      where p.id = participants.presentation_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from presentation_editors e
      where e.presentation_id = participants.presentation_id and e.user_id = auth.uid()
    )
  );

create policy "owners and editors update participants"
  on participants for update
  using (
    exists (
      select 1 from presentations p
      where p.id = participants.presentation_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from presentation_editors e
      where e.presentation_id = participants.presentation_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from presentations p
      where p.id = participants.presentation_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from presentation_editors e
      where e.presentation_id = participants.presentation_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "anyone insert responses" on responses;
drop policy if exists "anyone select responses" on responses;
drop policy if exists "anyone update responses" on responses;

create policy "owners and editors read responses"
  on responses for select
  using (
    exists (
      select 1
      from slides s
      join presentations p on p.id = s.presentation_id
      where s.id = responses.slide_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from slides s
      join presentation_editors e on e.presentation_id = s.presentation_id
      where s.id = responses.slide_id and e.user_id = auth.uid()
    )
  );

create policy "public read active qa responses"
  on responses for select
  using (
    exists (
      select 1
      from slides s
      join presentations p on p.id = s.presentation_id
      where s.id = responses.slide_id
        and s.type = 'qa'
        and p.state = 'active'
        and p.current_slide_id = s.id
    )
  );

drop policy if exists "anyone insert votes" on question_votes;
drop policy if exists "anyone select votes" on question_votes;
drop policy if exists "anyone delete votes" on question_votes;

create policy "owners and editors read votes"
  on question_votes for select
  using (
    exists (
      select 1
      from responses r
      join slides s on s.id = r.slide_id
      join presentations p on p.id = s.presentation_id
      where r.id = question_votes.response_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from responses r
      join slides s on s.id = r.slide_id
      join presentation_editors e on e.presentation_id = s.presentation_id
      where r.id = question_votes.response_id and e.user_id = auth.uid()
    )
  );

create policy "public read active qa votes"
  on question_votes for select
  using (
    exists (
      select 1
      from responses r
      join slides s on s.id = r.slide_id
      join presentations p on p.id = s.presentation_id
      where r.id = question_votes.response_id
        and s.type = 'qa'
        and p.state = 'active'
        and p.current_slide_id = s.id
    )
  );

drop policy if exists "anyone insert reactions" on reactions;
drop policy if exists "anyone select reactions" on reactions;

create policy "owners and editors read reactions"
  on reactions for select
  using (
    exists (
      select 1 from presentations p
      where p.id = reactions.presentation_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from presentation_editors e
      where e.presentation_id = reactions.presentation_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "service write ai_usage" on ai_usage;

drop policy if exists "editors read summaries" on slide_ai_summaries;
drop policy if exists "editors write summaries" on slide_ai_summaries;
create policy "editors read summaries" on slide_ai_summaries for select using (
  exists (
    select 1
    from slides s
    join presentation_editors e on e.presentation_id = s.presentation_id
    where s.id = slide_ai_summaries.slide_id and e.user_id = auth.uid()
  )
);
create policy "editors write summaries" on slide_ai_summaries for all using (
  exists (
    select 1
    from slides s
    join presentation_editors e on e.presentation_id = s.presentation_id
    where s.id = slide_ai_summaries.slide_id and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from slides s
    join presentation_editors e on e.presentation_id = s.presentation_id
    where s.id = slide_ai_summaries.slide_id and e.user_id = auth.uid()
  )
);

create table if not exists quiz_slide_scores (
  slide_id uuid not null references slides(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  points int not null,
  created_at timestamptz not null default now(),
  primary key (slide_id, participant_id)
);
alter table quiz_slide_scores enable row level security;

drop policy if exists "owners and editors read quiz scores" on quiz_slide_scores;
create policy "owners and editors read quiz scores"
  on quiz_slide_scores for select
  using (
    exists (
      select 1
      from slides s
      join presentations p on p.id = s.presentation_id
      where s.id = quiz_slide_scores.slide_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from slides s
      join presentation_editors e on e.presentation_id = s.presentation_id
      where s.id = quiz_slide_scores.slide_id and e.user_id = auth.uid()
    )
  );

create or replace function score_quiz_slide(p_slide_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct int;
  v_limit_ms int;
  v_inserted int := 0;
begin
  if not exists (
    select 1
    from slides s
    join presentations p on p.id = s.presentation_id
    where s.id = p_slide_id
      and s.type = 'quiz'
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1 from presentation_editors e
          where e.presentation_id = p.id and e.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'not allowed to score quiz slide';
  end if;

  select (s.config->>'correct_index')::int,
         coalesce((s.config->>'time_limit_s')::int, 20) * 1000
    into v_correct, v_limit_ms
    from slides s
    where s.id = p_slide_id;

  with scored as (
    select
      r.slide_id,
      r.participant_id,
      greatest(
        0,
        round(1000 * (1 - least(coalesce(r.response_ms, v_limit_ms), v_limit_ms)::numeric / v_limit_ms))
      )::int as points
    from responses r
    where r.slide_id = p_slide_id
      and r.value_index = v_correct
  ),
  inserted as (
    insert into quiz_slide_scores (slide_id, participant_id, points)
    select slide_id, participant_id, points
    from scored
    where points > 0
    on conflict (slide_id, participant_id) do nothing
    returning participant_id, points
  ),
  updated as (
    update participants p
      set score = p.score + i.points
      from inserted i
      where p.id = i.participant_id
      returning p.id
  )
  select count(*) into v_inserted from updated;

  return v_inserted;
end $$;
