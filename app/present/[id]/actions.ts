"use server";

import { createClient } from "@/lib/supabase/server";
import type { Slide, QuizConfig } from "@/lib/types";

export async function startPresentation(presentationId: string) {
  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("slides")
    .select("id")
    .eq("presentation_id", presentationId)
    .order("position", { ascending: true })
    .limit(1);
  const first = slides?.[0]?.id ?? null;
  const { error } = await supabase
    .from("presentations")
    .update({
      state: "active",
      current_slide_id: first,
      current_slide_started_at: new Date().toISOString(),
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

async function scoreQuizSlide(
  presentationId: string,
  slide: Pick<Slide, "id" | "type" | "config">,
) {
  const supabase = await createClient();
  const cfg = slide.config as QuizConfig;
  const timeLimitMs = (cfg.time_limit_s ?? 20) * 1000;
  const { data: correctResponses } = await supabase
    .from("responses")
    .select("participant_id, response_ms")
    .eq("slide_id", slide.id)
    .eq("value_index", cfg.correct_index);
  if (!correctResponses) return;

  for (const r of correctResponses) {
    const ms = Math.max(0, Math.min(timeLimitMs, r.response_ms ?? timeLimitMs));
    const points = Math.round(1000 * (1 - ms / timeLimitMs));
    if (points <= 0) continue;
    const { data: cur } = await supabase
      .from("participants")
      .select("score")
      .eq("id", r.participant_id)
      .single();
    if (!cur) continue;
    await supabase
      .from("participants")
      .update({ score: cur.score + points })
      .eq("id", r.participant_id);
  }
  void presentationId;
}
