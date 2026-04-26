"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmbedUrl } from "@/lib/embed";
import type { SlideType, SlideConfig, Theme } from "@/lib/types";

const DEFAULT_CONFIG: Record<SlideType, SlideConfig> = {
  mcq: { options: ["Option A", "Option B"] },
  wordcloud: { max_words_per_participant: 3 },
  open: {},
  quiz: { options: ["Right", "Wrong"], correct_index: 0, time_limit_s: 20 },
  qa: { upvotes: true },
  rating: { scale: 5, min_label: "Poor", max_label: "Great" },
  embed: { url: "", provider: "google-slides" },
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
  patch: { question?: string; config?: SlideConfig; image_url?: string | null; kahoot_mode?: boolean },
) {
  const supabase = await createClient();
  if (patch.config && (patch.config as { url?: string }).url !== undefined) {
    const url = String((patch.config as { url?: string }).url ?? "");
    if (url && !isAllowedEmbedUrl(url)) {
      throw new Error("Embed URL must be Google Slides or PowerPoint Web (https only).");
    }
  }
  const { error } = await supabase.from("slides").update(patch).eq("id", slideId);
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
}

export async function updatePresentationTheme(presentationId: string, theme: Theme) {
  const supabase = await createClient();
  const { error } = await supabase.from("presentations").update({ theme }).eq("id", presentationId);
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
  revalidatePath(`/present/${presentationId}`);
}

export async function addEditorByEmail(presentationId: string, email: string) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  // Look up the user by email through profiles. We don't expose auth.users directly.
  const { data: target } = await supabase
    .from("profiles")
    .select("id, display_name")
    .ilike("display_name", email)
    .maybeSingle();

  // Best-effort lookup via auth.admin would require service role — instead
  // we accept the user id directly as fallback. For now, surface a friendly
  // message if the lookup fails.
  if (!target) {
    throw new Error(`No Klikr user found for "${email}". Ask them to sign up first.`);
  }

  const { error } = await supabase
    .from("presentation_editors")
    .upsert({ presentation_id: presentationId, user_id: target.id, added_by: u.user.id });
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
}

export async function removeEditor(presentationId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("presentation_editors")
    .delete()
    .eq("presentation_id", presentationId)
    .eq("user_id", userId);
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
