"use server";

import { createClient } from "@/lib/supabase/server";
import type { Slide } from "@/lib/types";

export async function startPresentation(presentationId: string) {
  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("slides")
    .select("id")
    .eq("presentation_id", presentationId)
    .order("position", { ascending: true })
    .limit(1);
  const first = slides?.[0]?.id ?? null;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("presentations")
    .update({
      state: "active",
      current_slide_id: first,
      current_slide_started_at: now,
      last_started_at: now,
    })
    .eq("id", presentationId);
  if (error) throw error;
}

export async function moveSlide(presentationId: string, direction: "next" | "prev") {
  const supabase = await createClient();
  const { data: pres } = await supabase
    .from("presentations")
    .select("current_slide_id")
    .eq("id", presentationId)
    .single();
  if (!pres) return;

  const { data: slides } = await supabase
    .from("slides")
    .select("id, type, config, position")
    .eq("presentation_id", presentationId)
    .order("position", { ascending: true })
    .returns<Pick<Slide, "id" | "type" | "config" | "position">[]>();
  if (!slides || slides.length === 0) return;

  const idx = slides.findIndex((s) => s.id === pres.current_slide_id);
  const nextIdx = direction === "next" ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= slides.length) return;

  if (direction === "next" && idx >= 0 && slides[idx].type === "quiz") {
    await scoreQuizSlide(presentationId, slides[idx]);
  }

  const { error } = await supabase
    .from("presentations")
    .update({
      current_slide_id: slides[nextIdx].id,
      current_slide_started_at: new Date().toISOString(),
    })
    .eq("id", presentationId);
  if (error) throw error;
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
      await scoreQuizSlide(presentationId, slide);
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
  const { data, error } = await supabase
    .from("presentations")
    .select("id, state, current_slide_id, current_slide_started_at, slides!inner(id, type, config)")
    .eq("id", presentationId)
    .eq("slides.id", slideId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.state !== "active" || data.current_slide_id !== slideId) return;

  const joined = data.slides as unknown as Pick<Slide, "id" | "type" | "config"> | Pick<Slide, "id" | "type" | "config">[] | null;
  const slide = Array.isArray(joined) ? joined[0] : joined;
  if (!slide || slide.type !== "quiz") return;

  const cfg = slide.config as { time_limit_s?: number };
  const limitMs = Math.max(1, cfg.time_limit_s ?? 20) * 1000;
  const startedAt = data.current_slide_started_at ? new Date(data.current_slide_started_at).getTime() : 0;
  
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
