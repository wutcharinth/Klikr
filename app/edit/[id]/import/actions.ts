"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmbedUrl } from "@/lib/embed";

export async function addEmbedFromUrl(presentationId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const url = String(formData.get("url") ?? "").trim();
  if (!isAllowedEmbedUrl(url)) {
    throw new Error("URL must be from Google Slides or PowerPoint Web (https only).");
  }

  const provider = url.includes("docs.google.com") ? "google-slides" : "powerpoint";

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
    type: "embed",
    question: "Embedded slide",
    config: { url, provider },
  });
  if (error) throw error;
  revalidatePath(`/edit/${presentationId}`);
  redirect(`/edit/${presentationId}`);
}
