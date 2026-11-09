"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { containsProfanity } from "@/lib/profanity";
import { isMissingRpc } from "@/lib/supabase/rpc";
import { QUIZ_EARLY_TAP_GRACE_MS } from "@/lib/liveTiming";
import type { MCQConfig, Participant, QAConfig, QuizConfig, RankingConfig, Standing, StandingRow } from "@/lib/types";

export async function joinSession(presentationId: string, nickname: string) {
  const supabase = createServiceClient();
  const trimmed = nickname.trim().slice(0, 32);
  if (!trimmed) throw new Error("Nickname required");

  // Reject joins on closed/missing sessions so a leaked or guessed presentation
  // id can't farm participant rows after the host has wrapped up.
  const { data: pres, error: presErr } = await supabase
    .from("presentations")
    .select("id, state")
    .eq("id", presentationId)
    .maybeSingle();
  if (presErr) throw presErr;
  if (!pres) throw new Error("Session not found");
  if (pres.state !== "lobby" && pres.state !== "active") {
    throw new Error("This session is no longer open");
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({ presentation_id: presentationId, nickname: trimmed })
    .select("id, nickname, participant_token")
    .single();
  if (error) throw error;
  return data;
}

async function assertParticipant(input: { participantId: string; participantToken: string }) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, presentation_id")
    .eq("id", input.participantId)
    .eq("participant_token", input.participantToken)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Invalid participant session");
  return { supabase, participant: data };
}

async function assertCurrentSlide(
  supabase: ReturnType<typeof createServiceClient>,
  presentationId: string,
  slideId: string,
) {
  const { data: pres, error } = await supabase
    .from("presentations")
    .select("state, current_slide_id")
    .eq("id", presentationId)
    .maybeSingle();
  if (error) throw error;
  if (!pres || pres.state !== "active" || pres.current_slide_id !== slideId) {
    throw new Error("This slide is not accepting responses");
  }
}

type ParticipantWithPresentation = {
  id: string;
  presentation_id: string;
  presentations:
    | { state: string; current_slide_id: string | null; current_slide_started_at: string | null }
    | { state: string; current_slide_id: string | null; current_slide_started_at: string | null }[]
    | null;
};

export async function submitResponse(input: {
  slideId: string;
  participantId: string;
  participantToken: string;
  valueText?: string | null;
  valueIndex?: number | null;
}) {
  const supabase = createServiceClient();

  // One round trip covers the token check AND the active-slide gate (single
  // FK participants.presentation_id → presentations, so the embed is
  // unambiguous); the slide config loads in parallel. Previously these were
  // three sequential queries before the write.
  const [partRes, slideRes] = await Promise.all([
    supabase
      .from("participants")
      .select("id, presentation_id, presentations!inner(state, current_slide_id, current_slide_started_at)")
      .eq("id", input.participantId)
      .eq("participant_token", input.participantToken)
      .maybeSingle<ParticipantWithPresentation>(),
    supabase
      .from("slides")
      .select("id, type, config, presentation_id")
      .eq("id", input.slideId)
      .maybeSingle(),
  ]);
  if (partRes.error) throw partRes.error;
  const participant = partRes.data;
  if (!participant) throw new Error("Invalid participant session");
  const pres = Array.isArray(participant.presentations) ? participant.presentations[0] : participant.presentations;
  if (!pres || pres.state !== "active" || pres.current_slide_id !== input.slideId) {
    throw new Error("This slide is not accepting responses");
  }
  const slide = slideRes.data;
  if (!slide || slide.presentation_id !== participant.presentation_id) throw new Error("Slide not found");

  let valueText = input.valueText?.trim().slice(0, 500) ?? null;
  const valueIndex = input.valueIndex ?? null;

  // Multi-MCQ: valueText is JSON array of indices. Validate against options + max_choices.
  if (slide.type === "mcq") {
    const cfg = slide.config as MCQConfig;
    if (cfg.multi && valueText) {
      let picks: number[];
      try {
        picks = JSON.parse(valueText);
      } catch {
        throw new Error("Invalid multi-MCQ payload");
      }
      if (!Array.isArray(picks) || picks.some((n) => !Number.isInteger(n) || n < 0 || n >= cfg.options.length)) {
        throw new Error("Invalid option");
      }
      const max = cfg.max_choices ?? cfg.options.length;
      if (picks.length === 0 || picks.length > max) throw new Error(`Pick 1–${max}`);
      valueText = JSON.stringify(Array.from(new Set(picks)).sort((a, b) => a - b));
    }
  }

  // Ranking: valueText is JSON permutation of [0..items.length-1].
  if (slide.type === "ranking") {
    const cfg = slide.config as RankingConfig;
    if (!valueText) throw new Error("Ranking required");
    let order: number[];
    try {
      order = JSON.parse(valueText);
    } catch {
      throw new Error("Invalid ranking payload");
    }
    if (!Array.isArray(order) || order.length !== cfg.items.length) throw new Error("Ranking length mismatch");
    const seen = new Set<number>();
    for (const n of order) {
      if (!Number.isInteger(n) || n < 0 || n >= cfg.items.length || seen.has(n)) throw new Error("Invalid ranking");
      seen.add(n);
    }
    valueText = JSON.stringify(order);
  }

  // Content filter applies to wordcloud + open. Q&A has its own path (submitQuestion).
  if ((slide.type === "wordcloud" || slide.type === "open") && valueText && containsProfanity(valueText)) {
    throw new Error("Your response was filtered.");
  }

  // Quiz scoring is speed-weighted, so we must measure response_ms server-side.
  // Falls back to limit_ms (= zero speed bonus) if the slide somehow has no
  // started_at, since score_quiz_slide treats null as instant (max bonus).
  // started_at may sit slightly in the future during the "get ready" intro
  // (lib/liveTiming.ts); answers aren't open until it passes.
  const now = Date.now();
  let responseMs: number | null = null;
  if (slide.type === "quiz") {
    const cfg = slide.config as { time_limit_s?: number };
    const limitMs = Math.max(1, cfg.time_limit_s ?? 20) * 1000;
    const startedAt = pres.current_slide_started_at
      ? new Date(pres.current_slide_started_at).getTime()
      : 0;
    if (startedAt > 0 && now < startedAt - QUIZ_EARLY_TAP_GRACE_MS) {
      throw new Error("Answers open in a moment");
    }
    const elapsed = startedAt > 0 ? now - startedAt : limitMs;
    responseMs = Math.max(0, Math.min(limitMs, elapsed));
  }

  const { error } = await supabase.from("responses").upsert(
    {
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: valueText,
      value_index: valueIndex,
      response_ms: responseMs,
    },
    { onConflict: "slide_id,participant_id" },
  );
  if (error) throw error;

  // Non-quiz slides: return submission stats so the audience client can show
  // a "Nth in" takeover. Quiz slides skip this; the takeover for quiz fires on
  // local timer expiry, not on submit.
  if (slide.type !== "quiz") {
    const [respRes, partCountRes] = await Promise.all([
      supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .eq("slide_id", input.slideId),
      supabase
        .from("participants")
        .select("id", { count: "exact", head: true })
        .eq("presentation_id", participant.presentation_id),
    ]);
    return {
      ordinal: respRes.count ?? 1,
      total: Math.max(respRes.count ?? 1, partCountRes.count ?? 1),
      serverNow: Date.now(),
    };
  }
  return { serverNow: Date.now() };
}

async function listParticipantScores(
  supabase: ReturnType<typeof createServiceClient>,
  presentationId: string,
): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("id, presentation_id, nickname, score, created_at")
    .eq("presentation_id", presentationId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<Participant[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getParticipantScores(input: {
  presentationId: string;
  participantId: string;
  participantToken: string;
}): Promise<Participant[]> {
  const { supabase, participant } = await assertParticipant(input);
  if (participant.presentation_id !== input.presentationId) throw new Error("Invalid presentation");
  return listParticipantScores(supabase, input.presentationId);
}

type StandingRpc = {
  presentation_id: string;
  me: { id: string; nickname: string; score: number; rank: number };
  total: number;
  ahead: { nickname: string; score: number } | null;
  top: StandingRow[];
  scored_rev: number;
};

/** One player's score + rank, the player just ahead, and the top-N board, in
 *  a single small payload (get_standing RPC, migration 0027). The audience
 *  used to download the whole roster several times per question to work this
 *  out client-side. Falls back to that roster query if the RPC isn't there. */
export async function getStanding(input: {
  presentationId: string;
  participantId: string;
  participantToken: string;
  top?: number;
}): Promise<Standing> {
  const supabase = createServiceClient();
  const top = Math.max(0, Math.min(50, Math.round(input.top ?? 5)));
  const { data, error } = await supabase.rpc("get_standing", {
    p_participant_id: input.participantId,
    p_token: input.participantToken,
    p_top: top,
  });
  if (!error && data) {
    const s = data as StandingRpc;
    if (s.presentation_id !== input.presentationId) throw new Error("Invalid presentation");
    return { me: s.me, total: s.total, ahead: s.ahead, top: s.top ?? [], scoredRev: s.scored_rev ?? 0 };
  }
  if (error && !isMissingRpc(error)) {
    if (error.code === "28000") throw new Error("Invalid participant session");
    throw error;
  }

  // Fallback: migration 0027 not applied yet.
  const { participant } = await assertParticipant(input);
  if (participant.presentation_id !== input.presentationId) throw new Error("Invalid presentation");
  const [list, presRes] = await Promise.all([
    listParticipantScores(supabase, input.presentationId),
    supabase.from("presentations").select("scored_rev").eq("id", input.presentationId).maybeSingle(),
  ]);
  const idx = list.findIndex((p) => p.id === input.participantId);
  const meRow = list[idx];
  if (!meRow) throw new Error("Invalid participant session");
  return {
    me: { id: meRow.id, nickname: meRow.nickname, score: meRow.score, rank: idx + 1 },
    total: list.length,
    ahead: idx > 0 ? { nickname: list[idx - 1].nickname, score: list[idx - 1].score } : null,
    top: list.slice(0, top).map((p, i) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      created_at: p.created_at,
      rank: i + 1,
    })),
    scoredRev: (presRes.data?.scored_rev as number | undefined) ?? 0,
  };
}

export type QuizResult =
  | {
      /** The question is still running; ask again after `retryAfterMs`. */
      status: "open";
      retryAfterMs: number;
    }
  | {
      status: "closed";
      /** null only for a malformed slide with no answer key (nobody scores). */
      correct_index: number | null;
      /** This participant's recorded answer, or null if they didn't answer. */
      my_answer: number | null;
      /** Points this participant earned on the slide, from quiz_slide_scores.
       *  null when the answer is correct but the host hasn't scored the slide
       *  yet (scoring lands ~0.5–1s after the window closes). */
      points: number | null;
    };

/** The answer key plus this participant's own result for a quiz slide. The
 *  audience page never receives `correct_index` (see lib/audienceSlides.ts), so
 *  this is the only way a phone learns the answer — and it refuses while the
 *  question is still open, so the speed-scored quiz can't be read ahead. */
export async function getQuizResult(input: {
  slideId: string;
  participantId: string;
  participantToken: string;
}): Promise<QuizResult> {
  const { supabase, participant } = await assertParticipant(input);

  // One parallel round trip for everything; nothing answer-related is returned
  // unless the gate below decides the question has closed.
  const [slideRes, presRes, respRes, scoreRes] = await Promise.all([
    supabase
      .from("slides")
      .select("id, presentation_id, type, config")
      .eq("id", input.slideId)
      .maybeSingle(),
    supabase
      .from("presentations")
      .select("state, current_slide_id, current_slide_started_at")
      .eq("id", participant.presentation_id)
      .maybeSingle(),
    supabase
      .from("responses")
      .select("value_index")
      .eq("slide_id", input.slideId)
      .eq("participant_id", participant.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("quiz_slide_scores")
      .select("points")
      .eq("slide_id", input.slideId)
      .eq("participant_id", participant.id)
      .maybeSingle(),
  ]);
  for (const r of [slideRes, presRes, respRes, scoreRes]) {
    if (r.error) throw r.error;
  }
  const slide = slideRes.data;
  const pres = presRes.data;
  if (!slide || slide.type !== "quiz" || slide.presentation_id !== participant.presentation_id) {
    throw new Error("Quiz slide not found");
  }
  if (!pres) throw new Error("Session not found");
  const cfg = slide.config as Partial<QuizConfig>;

  // Once the session is closed every question is over. Otherwise:
  if (pres.state !== "closed") {
    if (pres.current_slide_id === slide.id) {
      // The live question closes when its answer window runs out, on the
      // server's clock. current_slide_started_at is when answers open (it sits
      // in the future during the "get ready" intro, lib/liveTiming.ts), and
      // the host's "end question now" rewinds it, so a force-ended question
      // passes this check straight away.
      const limitMs = Math.max(1, cfg.time_limit_s ?? 20) * 1000;
      const startedAt = pres.current_slide_started_at
        ? new Date(pres.current_slide_started_at).getTime()
        : NaN;
      if (!Number.isFinite(startedAt)) return { status: "open", retryAfterMs: 1000 };
      const remainingMs = startedAt + limitMs - Date.now();
      if (remainingMs > 0) return { status: "open", retryAfterMs: remainingMs };
    } else {
      // Not the live slide: only reveal it if it has already been played, or
      // a player could pull the answer to an upcoming question by its id.
      // Responses can only be written by submitResponse, which requires the
      // slide to be live, so any response row proves the question was asked.
      const { count, error } = await supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .eq("slide_id", slide.id);
      if (error) throw error;
      if (!count) throw new Error("This question hasn't been played yet");
    }
  }

  const correctIndex = typeof cfg.correct_index === "number" ? cfg.correct_index : null;
  const myAnswer = typeof respRes.data?.value_index === "number" ? respRes.data.value_index : null;
  const isCorrect = correctIndex !== null && myAnswer === correctIndex;
  // score_quiz_slide only writes rows for correct answers, so a missing row
  // means 0 for a wrong/skipped answer but "not scored yet" for a correct one.
  const scored = typeof scoreRes.data?.points === "number" ? scoreRes.data.points : null;
  const points = scored ?? (isCorrect ? null : 0);

  return { status: "closed", correct_index: correctIndex, my_answer: myAnswer, points };
}

/** Q&A slides allow each participant to submit MULTIPLE questions, so we INSERT
 *  rather than upsert. Returns the new row id + status so the client can render
 *  an "awaiting approval" hint when moderation is on. */
export async function submitQuestion(input: {
  slideId: string;
  participantId: string;
  participantToken: string;
  text: string;
}) {
  const { supabase, participant } = await assertParticipant(input);
  await assertCurrentSlide(supabase, participant.presentation_id, input.slideId);
  const text = input.text.trim().slice(0, 280);
  if (!text) throw new Error("Question required");

  const { data: slide } = await supabase
    .from("slides")
    .select("config")
    .eq("id", input.slideId)
    .maybeSingle();
  const cfg = (slide?.config ?? {}) as QAConfig;
  const flagged = containsProfanity(text);
  // Flagged questions always go to the tray, regardless of moderation mode.
  const status = flagged ? "pending" : cfg.moderation === "pre" ? "pending" : "approved";

  const { data, error } = await supabase
    .from("responses")
    .insert({
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: text,
      status,
      flagged,
    })
    .select("id, status")
    .single();
  if (error) throw error;
  return { id: data.id as string, status: data.status as string };
}

/** Owner-only: change a question's moderation status or pin/unpin it. */
export async function setQuestionStatus(input: {
  responseId: string;
  status?: "approved" | "rejected" | "answered" | "pending";
  pinned?: boolean;
}) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  // Verify the user owns the presentation this response belongs to.
  const { data: row } = await supabase
    .from("responses")
    .select("id, slides!inner(presentation_id, presentations!slides_presentation_id_fkey(owner_id))")
    .eq("id", input.responseId)
    .maybeSingle();
  type Joined = { slides: { presentations: { owner_id: string } | { owner_id: string }[] } | { presentations: { owner_id: string } | { owner_id: string }[] }[] };
  const slides = (row as unknown as Joined | null)?.slides;
  const slide = Array.isArray(slides) ? slides[0] : slides;
  const pres = Array.isArray(slide?.presentations) ? slide?.presentations?.[0] : slide?.presentations;
  if (!pres || pres.owner_id !== u.user.id) throw new Error("Not allowed");

  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.pinned !== undefined) patch.pinned = input.pinned;
  if (Object.keys(patch).length === 0) return;

  const service = createServiceClient();
  const { error } = await service.from("responses").update(patch).eq("id", input.responseId);
  if (error) throw error;
}

/** Toggle an upvote on a Q&A question. Returns whether the user is now upvoting. */
export async function toggleQuestionVote(input: {
  responseId: string;
  participantId: string;
  participantToken: string;
}) {
  const { supabase, participant } = await assertParticipant(input);
  const { data: response } = await supabase
    .from("responses")
    .select("id, slides!inner(presentation_id)")
    .eq("id", input.responseId)
    .maybeSingle();
  const slide = response?.slides as unknown as { presentation_id: string } | { presentation_id: string }[] | null;
  const presentationId = Array.isArray(slide) ? slide[0]?.presentation_id : slide?.presentation_id;
  if (presentationId !== participant.presentation_id) throw new Error("Question is not in this session");

  const { data: existing } = await supabase
    .from("question_votes")
    .select("id")
    .eq("response_id", input.responseId)
    .eq("participant_id", input.participantId)
    .maybeSingle();
  if (existing) {
    await supabase.from("question_votes").delete().eq("id", existing.id);
    return false;
  }
  await supabase.from("question_votes").insert({
    response_id: input.responseId,
    participant_id: input.participantId,
  });
  return true;
}

/** Floating live reaction. */
export async function sendReaction(input: {
  presentationId: string;
  participantId: string;
  participantToken: string;
  emoji: string;
}) {
  const { supabase, participant } = await assertParticipant(input);
  if (participant.presentation_id !== input.presentationId) throw new Error("Invalid presentation");
  const { error } = await supabase.from("reactions").insert({
    presentation_id: input.presentationId,
    participant_id: input.participantId,
    emoji: input.emoji.slice(0, 8),
  });
  if (error) throw error;
}

/** Audience post-session feedback on the Klikr app experience. Inserts via the
 *  service-role client because audience sessions are anonymous and the RLS
 *  policy on app_feedback requires auth.uid() to be set. */
export async function submitAudienceFeedback(input: {
  rating: number;
  comment: string;
  pagePath: string;
}) {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  if (Number.isNaN(rating)) return { error: "invalid_rating" };
  const comment = (input.comment ?? "").trim().slice(0, 2000);

  const svc = createServiceClient();
  const { error } = await svc.from("app_feedback").insert({
    user_id: null,
    persona: "audience",
    rating,
    comment,
    page_path: input.pagePath?.slice(0, 200) ?? null,
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}
