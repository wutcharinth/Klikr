-- Live-session performance: move per-player leaderboard math, Q&A vote
-- tallies and slide navigation into the database so each client makes one
-- small round trip instead of many large ones.
--
-- Every function here has a TypeScript fallback (see lib/supabase/rpc.ts), so
-- the app keeps working if code ships before this migration is applied.

-- Rank lookups ("how many players are ahead of me") and the top-N board both
-- walk participants of one presentation in score order.
create index if not exists participants_rank_idx
  on participants (presentation_id, score desc, created_at, id);

-- ---------------------------------------------------------------------------
-- get_standing: one player's score, rank, the player directly ahead, and the
-- top-N board, authenticated by the participant token. Replaces the audience
-- pattern of downloading the entire participant list (O(players) rows per
-- phone, several times per question) to compute a rank client-side.
--
-- Ordering matches the client-side annotateRanks(): score desc, then
-- created_at asc, then id asc as a deterministic final tie-break.
-- ---------------------------------------------------------------------------
create or replace function get_standing(
  p_participant_id uuid,
  p_token text,
  p_top int default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me participants%rowtype;
  v_rank int;
  v_total int;
  v_ahead jsonb;
  v_top jsonb;
  v_rev int;
  v_limit int := greatest(0, least(coalesce(p_top, 5), 50));
begin
  select * into v_me
    from participants
   where id = p_participant_id
     and participant_token = p_token;
  if not found then
    raise exception 'invalid participant session' using errcode = '28000';
  end if;

  select count(*) into v_total
    from participants
   where presentation_id = v_me.presentation_id;

  select count(*) + 1 into v_rank
    from participants p
   where p.presentation_id = v_me.presentation_id
     and (
       p.score > v_me.score
       or (p.score = v_me.score and (p.created_at, p.id) < (v_me.created_at, v_me.id))
     );

  select jsonb_build_object('nickname', p.nickname, 'score', p.score)
    into v_ahead
    from participants p
   where p.presentation_id = v_me.presentation_id
     and (
       p.score > v_me.score
       or (p.score = v_me.score and (p.created_at, p.id) < (v_me.created_at, v_me.id))
     )
   order by p.score asc, p.created_at desc, p.id desc
   limit 1;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', t.id,
               'nickname', t.nickname,
               'score', t.score,
               'created_at', t.created_at,
               'rank', t.rn
             )
             order by t.rn
           ),
           '[]'::jsonb
         )
    into v_top
    from (
      select p.id, p.nickname, p.score, p.created_at,
             row_number() over (order by p.score desc, p.created_at asc, p.id asc) as rn
        from participants p
       where p.presentation_id = v_me.presentation_id
       order by p.score desc, p.created_at asc, p.id asc
       limit v_limit
    ) t;

  select scored_rev into v_rev
    from presentations
   where id = v_me.presentation_id;

  return jsonb_build_object(
    'presentation_id', v_me.presentation_id,
    'me', jsonb_build_object(
      'id', v_me.id,
      'nickname', v_me.nickname,
      'score', v_me.score,
      'rank', v_rank
    ),
    'total', v_total,
    'ahead', v_ahead,
    'top', v_top,
    'scored_rev', coalesce(v_rev, 0)
  );
end $$;

-- ---------------------------------------------------------------------------
-- get_qa_votes: per-question upvote totals for one Q&A slide (plus whether
-- the given participant voted), aggregated in SQL. Previously every client
-- downloaded every vote row and re-downloaded them on every vote anywhere.
-- Security invoker: it reads exactly what the caller's RLS already allows.
-- ---------------------------------------------------------------------------
create or replace function get_qa_votes(
  p_slide_id uuid,
  p_participant_id uuid default null
)
returns table (response_id uuid, votes int, mine boolean)
language sql
stable
set search_path = public
as $$
  select v.response_id,
         count(*)::int as votes,
         coalesce(bool_or(v.participant_id = p_participant_id), false) as mine
    from question_votes v
    join responses r on r.id = v.response_id
   where r.slide_id = p_slide_id
   group by v.response_id
$$;

-- ---------------------------------------------------------------------------
-- move_slide: advance/rewind a live presentation in one round trip. Scores
-- the slide being left when it's a quiz (score_quiz_slide is idempotent, so a
-- slide already scored at timer expiry costs nothing), then moves to the
-- neighbouring slide. Quiz slides get a short "get ready" intro: their answer
-- window starts p_intro_ms in the future (clamped to 0–10s), and response
-- timing/scoring is measured from that start.
-- ---------------------------------------------------------------------------
create or replace function move_slide(
  p_presentation_id uuid,
  p_direction text,
  p_intro_ms int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pres presentations%rowtype;
  v_idx int;
  v_cur_type text;
  v_target uuid;
  v_target_type text;
  v_started timestamptz;
  v_intro_ms int := greatest(0, least(coalesce(p_intro_ms, 0), 10000));
begin
  if p_direction not in ('next', 'prev') then
    raise exception 'direction must be next or prev' using errcode = '22023';
  end if;

  select * into v_pres
    from presentations
   where id = p_presentation_id
   for update;
  if not found then
    raise exception 'presentation not found' using errcode = 'P0002';
  end if;

  if not (
    v_pres.owner_id = auth.uid()
    or exists (
      select 1 from presentation_editors e
      where e.presentation_id = v_pres.id and e.user_id = auth.uid()
    )
  ) then
    raise exception 'not allowed to control this presentation' using errcode = '42501';
  end if;

  select o.rn, o.type into v_idx, v_cur_type
    from (
      select s.id, s.type,
             row_number() over (order by s.position asc, s.id asc) as rn
        from slides s
       where s.presentation_id = p_presentation_id
    ) o
   where o.id = v_pres.current_slide_id;

  -- Current slide missing (deleted mid-session): "next" lands on slide 1.
  if v_idx is null then
    v_idx := 0;
  end if;

  select o.id, o.type into v_target, v_target_type
    from (
      select s.id, s.type,
             row_number() over (order by s.position asc, s.id asc) as rn
        from slides s
       where s.presentation_id = p_presentation_id
    ) o
   where o.rn = v_idx + case when p_direction = 'next' then 1 else -1 end;

  if v_target is null then
    return jsonb_build_object(
      'moved', false,
      'current_slide_id', v_pres.current_slide_id,
      'current_slide_started_at', v_pres.current_slide_started_at,
      'scored_rev', v_pres.scored_rev
    );
  end if;

  -- Scoring must never block navigation — the host must always be able to
  -- move on. The slide is normally already scored at timer expiry.
  if p_direction = 'next' and v_cur_type = 'quiz' then
    begin
      perform score_quiz_slide(v_pres.current_slide_id);
    exception when others then
      raise warning 'score_quiz_slide failed during move_slide: %', sqlerrm;
    end;
  end if;

  v_started := now() + make_interval(
    secs => (case when v_target_type = 'quiz' then v_intro_ms else 0 end)::double precision / 1000.0
  );

  update presentations
     set current_slide_id = v_target,
         current_slide_started_at = v_started
   where id = p_presentation_id;

  return jsonb_build_object(
    'moved', true,
    'current_slide_id', v_target,
    'current_slide_started_at', v_started,
    'scored_rev', (select scored_rev from presentations where id = p_presentation_id)
  );
end $$;
