"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/code";

export async function applyTemplate(slug: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=/templates/${slug}`);

  const { data: tpl, error: tplErr } = await supabase
    .from("templates")
    .select("id, title")
    .eq("slug", slug)
    .single();
  if (tplErr || !tpl) throw new Error("Template not found");

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase.rpc("apply_template", {
      p_template_id: tpl.id,
      p_owner_id: userData.user.id,
      p_title: tpl.title,
      p_code: code,
    });
    if (!error && data) {
      revalidatePath("/dashboard");
      redirect(`/edit/${data}`);
    }
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not generate unique room code");
}

export async function saveAsTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const presentationId = String(formData.get("presentation_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "Business");
  const visibility = String(formData.get("visibility") ?? "private");
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  if (!presentationId || !title) throw new Error("Missing fields");

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;

  const { data, error } = await supabase.rpc("save_as_template", {
    p_presentation_id: presentationId,
    p_owner_id: userData.user.id,
    p_slug: slug,
    p_title: title,
    p_description: description,
    p_category: category,
    p_tags: tags,
    p_visibility: visibility,
  });
  if (error) throw error;

  revalidatePath("/templates");
  redirect(`/templates/${slug}`);
}
