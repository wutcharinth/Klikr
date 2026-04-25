"use server";

import { createClient } from "@/lib/supabase/server";

export async function joinSession(presentationId: string, nickname: string) {
  const supabase = await createClient();
  const trimmed = nickname.trim().slice(0, 32);
  if (!trimmed) throw new Error("Nickname required");
  const { data, error } = await supabase
    .from("participants")
    .insert({ presentation_id: presentationId, nickname: trimmed })
    .select("id, nickname")
    .single();
  if (error) throw error;
  return data;
}

export async function submitResponse(input: {
  slideId: string;
  participantId: string;
  valueText?: string | null;
  valueIndex?: number | null;
  responseMs?: number | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("responses").upsert(
    {
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: input.valueText ?? null,
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
  text: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("responses")
    .insert({
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: input.text.trim().slice(0, 280),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Toggle an upvote on a Q&A question. Returns whether the user is now upvoting. */
export async function toggleQuestionVote(input: { responseId: string; participantId: string }) {
  const supabase = await createClient();
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
  emoji: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("reactions").insert({
    presentation_id: input.presentationId,
    participant_id: input.participantId,
    emoji: input.emoji.slice(0, 8),
  });
  if (error) throw error;
}
