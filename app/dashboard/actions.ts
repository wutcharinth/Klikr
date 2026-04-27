"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/code";

export async function createPresentation(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const title = String(formData.get("title") ?? "Untitled").trim() || "Untitled";

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("presentations")
      .insert({ owner_id: userData.user.id, title, code })
      .select("id")
      .single();
    if (!error && data) {
      redirect(`/edit/${data.id}`);
    }
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not generate unique room code");
}

export async function deletePresentation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("presentations").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function setPinned(id: string, pinned: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("presentations")
    .update({ pinned })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function duplicatePresentation(sourceId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: source, error: srcErr } = await supabase
    .from("presentations")
    .select("title, theme, is_template, source_template_id")
    .eq("id", sourceId)
    .single<{
      title: string;
      theme: unknown;
      is_template: boolean | null;
      source_template_id: string | null;
    }>();
  if (srcErr || !source) throw srcErr ?? new Error("Source not found");

  const { data: slides, error: slidesErr } = await supabase
    .from("slides")
    .select("position, type, question, config, image_url, image_credit, kahoot_mode")
    .eq("presentation_id", sourceId)
    .order("position", { ascending: true });
  if (slidesErr) throw slidesErr;

  const newTitle = `${source.title} (copy)`;
  let newId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("presentations")
      .insert({
        owner_id: userData.user.id,
        title: newTitle,
        code,
        theme: source.theme ?? null,
        is_template: source.is_template ?? false,
        source_template_id: source.source_template_id ?? null,
      })
      .select("id")
      .single();
    if (!error && data) {
      newId = data.id;
      break;
    }
    if (error && error.code !== "23505") throw error;
  }
  if (!newId) throw new Error("Could not generate unique room code");

  if (slides && slides.length > 0) {
    const rows = slides.map((s) => ({ ...s, presentation_id: newId }));
    const { error: insErr } = await supabase.from("slides").insert(rows);
    if (insErr) throw insErr;
  }

  revalidatePath("/dashboard");
  redirect(`/edit/${newId}`);
}
