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
