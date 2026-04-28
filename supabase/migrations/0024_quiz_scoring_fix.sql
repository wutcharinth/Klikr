-- Quiz scoring: every correct answer earns at least the base points,
-- regardless of timing. Previously a NULL response_ms (or one that hit the
-- time limit) collapsed the speed bonus to 0 AND the row was filtered out
-- by `where points > 0`, so the participant's score never moved.
--
-- New formula: base 500 + up to 500 speed bonus, where missing response_ms
-- is treated as a fast answer (max bonus) rather than a slow one (no bonus).
-- A correct answer always nets at least 500 points.

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

  return v_inserted;
end $$;
