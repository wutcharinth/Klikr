"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SlideType, SlideConfig } from "@/lib/types";

const DEFAULT_CONFIG: Record<SlideType, SlideConfig> = {
  mcq: { options: ["Option A", "Option B"] },
  wordcloud: { max_words_per_participant: 3 },
  open: {},
  quiz: { options: ["Right", "Wrong"], correct_index: 0, time_limit_s: 20 },
  qa: { upvotes: true },
  rating: { scale: 5, min_label: "Poor", max_label: "Great" },
};

export async function addSlide(presentationId: string, type: SlideType) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("slides")
    .select("position")
    .eq("presentation_id", presentationId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("slides").insert({
    presentation_id: presentationId,
    position: nextPos,
    type,
    question: "",
    config: DEFAULT_CONFIG[type],
  });
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
}

export async function updateSlide(
  slideId: string,
  presentationId: string,
  patch: { question?: string; config?: SlideConfig; image_url?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("slides").update(patch).eq("id", slideId);
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
}

export async function deleteSlide(slideId: string, presentationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("slides").delete().eq("id", slideId);
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
}

export async function updatePresentationTitle(presentationId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("presentations")
    .update({ title })
    .eq("id", presentationId);
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
}
