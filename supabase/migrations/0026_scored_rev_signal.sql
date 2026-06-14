-- Audience score display lagged ~one question behind the host.
--
-- The audience reads scores by polling getParticipantScores (service-role)
-- every 1.5s and has NO realtime path for score changes: migration 0011
-- removed anon SELECT on `participants`, and Supabase Realtime enforces RLS,
-- so the anon audience client never receives participant change events.
-- Scoring writes only `participants.score`, never `presentations`, so the
-- audience gets no signal that scores changed — its reveal read + 1.5s poll
-- race the host's async score write.
--
-- Fix: a monotonic `scored_rev` counter on `presentations` (a row the audience
-- ALREADY subscribes to via Realtime). Bump it inside score_quiz_slide — the
-- single scoring chokepoint, called by expiry, moveSlide, and endPresentation —
-- in the SAME transaction as the score write, so the audience can never see the
-- signal before the score commits. The audience refetches scores on the bump.

alter table presentations
  add column if not exists scored_rev int not null default 0;

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
  v_presentation_id uuid;
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
         coalesce((s.config->>'time_limit_s')::int, 20) * 1000,
         s.presentation_id
    into v_correct, v_limit_ms, v_presentation_id
    from slides s
    where s.id = p_slide_id;

  if v_correct is null then
    return 0;
  end if;

  with scored as (
    select
      r.slide_id,
      r.participant_id,
      (
        500
        + greatest(
            0,
            round(500 * (1 - least(coalesce(r.response_ms, 0), v_limit_ms)::numeric / v_limit_ms))
          )
      )::int as points
    from responses r
    where r.slide_id = p_slide_id
      and r.value_index = v_correct
  ),
  inserted as (
    insert into quiz_slide_scores (slide_id, participant_id, points)
    select slide_id, participant_id, points
    from scored
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

  -- Signal the audience (subscribed to this presentations row) to refetch
  -- scores the instant they change. Only bump when scoring actually moved a
  -- score, so idempotent re-scores (moveSlide/endPresentation re-call this RPC,
  -- and quiz_slide_scores has `on conflict do nothing`) don't fire needless
  -- audience refetches.
  if v_inserted > 0 and v_presentation_id is not null then
    update presentations set scored_rev = scored_rev + 1 where id = v_presentation_id;
  end if;

  return v_inserted;
end $$;
