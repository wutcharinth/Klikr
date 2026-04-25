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
