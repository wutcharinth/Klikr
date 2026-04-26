"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { containsProfanity } from "@/lib/profanity";
import type { MCQConfig, QAConfig, RankingConfig } from "@/lib/types";

export async function joinSession(presentationId: string, nickname: string) {
  const supabase = createServiceClient();
  const trimmed = nickname.trim().slice(0, 32);
  if (!trimmed) throw new Error("Nickname required");
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

export async function submitResponse(input: {
  slideId: string;
  participantId: string;
  participantToken: string;
  valueText?: string | null;
  valueIndex?: number | null;
  responseMs?: number | null;
}) {
  const { supabase, participant } = await assertParticipant(input);
  await assertCurrentSlide(supabase, participant.presentation_id, input.slideId);

  // Pull slide so we can validate type-specific payloads + run the content filter.
  const { data: slide } = await supabase
    .from("slides")
    .select("id, type, config")
    .eq("id", input.slideId)
    .maybeSingle();
  if (!slide) throw new Error("Slide not found");

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

  const { error } = await supabase.from("responses").upsert(
    {
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: valueText,
      value_index: valueIndex,
      response_ms: input.responseMs ?? null,
    },
    { onConflict: "slide_id,participant_id" },
  );
  if (error) throw error;
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
    .select("id, slides!inner(presentation_id, presentations!inner(owner_id))")
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
