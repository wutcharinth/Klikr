"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function submitFeedback(input: {
  rating: number;
  comment: string;
  persona: "host" | "audience" | "admin";
  pagePath: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  // RLS requires auth.uid() to be set, so bail early for anonymous callers.
  if (!userData.user) return { error: "auth_required" };

  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const comment = (input.comment ?? "").trim().slice(0, 2000);
  const persona =
    input.persona === "audience" || input.persona === "admin" ? input.persona : "host";

  const h = await headers();
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await supabase.from("app_feedback").insert({
    user_id: userData.user.id,
    rating,
    comment,
    persona,
    page_path: input.pagePath?.slice(0, 200) ?? null,
    user_agent: userAgent,
  });

  if (error) return { error: error.message };
  return { ok: true as const };
}
