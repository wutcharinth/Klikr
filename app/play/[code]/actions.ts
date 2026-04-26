"use server";

import { createServiceClient } from "@/lib/supabase/service";

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
  const { error } = await supabase.from("responses").upsert(
    {
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: input.valueText?.trim().slice(0, 500) ?? null,
      value_index: input.valueIndex ?? null,
      response_ms: input.responseMs ?? null,
    },
    { onConflict: "slide_id,participant_id" },
  );
  if (error) throw error;
}

/** Q&A slides allow each participant to submit MULTIPLE questions, so we INSERT
 *  rather than upsert. Returns the new row id so the client can locally optimistic-render. */
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
  const { data, error } = await supabase
    .from("responses")
    .insert({
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: text,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
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
