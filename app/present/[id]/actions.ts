"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingRpc } from "@/lib/supabase/rpc";
import { QUIZ_INTRO_MS, startedAtFor } from "@/lib/liveTiming";
import type { Slide } from "@/lib/types";

export async function startPresentation(presentationId: string) {
  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("slides")
    .select("id, type")
    .eq("presentation_id", presentationId)
    .order("position", { ascending: true })
    .limit(1);
  const first = slides?.[0] ?? null;
  const nowMs = Date.now();
  const startedAt = startedAtFor(first?.type, nowMs);
  const { error } = await supabase
    .from("presentations")
    .update({
      state: "active",
      current_slide_id: first?.id ?? null,
      current_slide_started_at: startedAt,
      last_started_at: new Date(nowMs).toISOString(),
    })
    .eq("id", presentationId);
  if (error) throw error;
  return { currentSlideId: first?.id ?? null, currentSlideStartedAt: startedAt };
}

export type MoveResult = {
  moved: boolean;
  currentSlideId: string | null;
  currentSlideStartedAt: string | null;
};

export async function moveSlide(presentationId: string, direction: "next" | "prev"): Promise<MoveResult> {
  const supabase = await createClient();

  // Fast path (migration 0027): score the outgoing quiz + move, in one
  // transaction and one round trip. Quiz targets get the get-ready intro.
  const { data, error } = await supabase.rpc("move_slide", {
    p_presentation_id: presentationId,
    p_direction: direction,
    p_intro_ms: QUIZ_INTRO_MS,
  });
  if (!error && data) {
    const r = data as { moved: boolean; current_slide_id: string | null; current_slide_started_at: string | null };
    return { moved: r.moved, currentSlideId: r.current_slide_id, currentSlideStartedAt: r.current_slide_started_at };
  }
  if (error && !isMissingRpc(error)) throw error;

  // Fallback: the original multi-query path (lookups in parallel).
  const [presRes, slidesRes] = await Promise.all([
    supabase.from("presentations").select("current_slide_id, current_slide_started_at").eq("id", presentationId).single(),
    supabase
      .from("slides")
      .select("id, type, config, position")
      .eq("presentation_id", presentationId)
      .order("position", { ascending: true })
      .returns<Pick<Slide, "id" | "type" | "config" | "position">[]>(),
  ]);
  const pres = presRes.data;
  const slides = slidesRes.data;
  const unchanged: MoveResult = {
    moved: false,
    currentSlideId: pres?.current_slide_id ?? null,
    currentSlideStartedAt: pres?.current_slide_started_at ?? null,
  };
  if (!pres || !slides || slides.length === 0) return unchanged;

  const idx = slides.findIndex((s) => s.id === pres.current_slide_id);
  const nextIdx = direction === "next" ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= slides.length) return unchanged;

  if (direction === "next" && idx >= 0 && slides[idx].type === "quiz") {
    // Scoring must never block navigation — if it throws (e.g. a malformed
    // slide config), advance anyway. The slide is typically already scored at
    // timer expiry, and the host must always be able to move on.
    try {
      await scoreQuizSlide(presentationId, slides[idx]);
    } catch (err) {
      console.error("scoreQuizSlide failed during moveSlide; advancing anyway", err);
    }
  }

  const target = slides[nextIdx];
  const startedAt = startedAtFor(target.type);
  const { error: updErr } = await supabase
    .from("presentations")
    .update({
      current_slide_id: target.id,
      current_slide_started_at: startedAt,
    })
    .eq("id", presentationId);
  if (updErr) throw updErr;
  return { moved: true, currentSlideId: target.id, currentSlideStartedAt: startedAt };
}

export async function endPresentation(presentationId: string) {
  const supabase = await createClient();
  const { data: pres } = await supabase
    .from("presentations")
    .select("current_slide_id")
    .eq("id", presentationId)
    .single();
  if (pres?.current_slide_id) {
    const { data: slide } = await supabase
      .from("slides")
      .select("id, type, config, position")
      .eq("id", pres.current_slide_id)
      .single<Pick<Slide, "id" | "type" | "config" | "position">>();
    if (slide?.type === "quiz") {
      // Ending must never be blocked by scoring — if the final-slide score RPC
      // throws (e.g. a malformed slide config), close the session anyway. The
      // host explicitly chose to end; the final slide is usually already scored
      // at timer expiry.
      try {
        await scoreQuizSlide(presentationId, slide);
      } catch (err) {
        console.error("scoreQuizSlide failed during endPresentation; closing anyway", err);
      }
    }
  }
  const { error } = await supabase
    .from("presentations")
    .update({ state: "closed" })
    .eq("id", presentationId);
  if (error) throw error;
}

export async function scoreActiveQuizSlide(presentationId: string, slideId: string, options?: { force?: boolean }) {
  const supabase = await createClient();
  // Separate lookups, NOT a `slides!inner` embed: presentations<->slides has
  // two FKs (slides.presentation_id and presentations.current_slide_id), so the
  // embed is ambiguous and errors with PGRST201. That error was thrown and
  // swallowed by the caller, so expiry-scoring silently failed and scores only
  // landed at moveSlide — i.e. one question behind.
  const { data: pres, error } = await supabase
    .from("presentations")
    .select("state, current_slide_id")
    .eq("id", presentationId)
    .maybeSingle();
  if (error) throw error;
  if (!pres || pres.state !== "active" || pres.current_slide_id !== slideId) return;

  const { data: slideRow } = await supabase
    .from("slides")
    .select("id, type, config")
    .eq("id", slideId)
    .maybeSingle();
  const slide = (slideRow ?? null) as Pick<Slide, "id" | "type" | "config"> | null;
  if (!slide || slide.type !== "quiz") return;

  const cfg = slide.config as { time_limit_s?: number };
  const limitMs = Math.max(1, cfg.time_limit_s ?? 20) * 1000;
  
  // Trust the host's client. If they call this (even without force), 
  // their timer has expired. This prevents clock drift from breaking scoring.

  if (options?.force) {
    const forcedStartedAt = new Date(Date.now() - limitMs - 250).toISOString();
    const { error: updateErr } = await supabase
      .from("presentations")
      .update({ current_slide_started_at: forcedStartedAt })
      .eq("id", presentationId)
      .eq("current_slide_id", slideId);
    if (updateErr) throw updateErr;
  }

  await scoreQuizSlide(presentationId, slide);
}

async function scoreQuizSlide(
  presentationId: string,
  slide: Pick<Slide, "id" | "type" | "config">,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("score_quiz_slide", { p_slide_id: slide.id });
  if (error) throw error;
  void presentationId;
}
