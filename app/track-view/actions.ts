"use server";

import { createClient } from "@/lib/supabase/server";

// Trim & sanitize a raw path so we don't blow out the column with query strings
// or absolute URLs that leaked from a referrer.
function cleanPath(p: string | undefined | null): string {
  if (!p) return "/";
  // Strip query strings and hash to keep the bucketing tight.
  const noQuery = p.split("?")[0].split("#")[0];
  // Cap length so abuse can't fill the table with garbage.
  return noQuery.slice(0, 200) || "/";
}

export async function recordPageView(input: { path: string; referrer?: string | null }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("page_views").insert({
    path: cleanPath(input.path),
    user_id: userData.user?.id ?? null,
    referrer: input.referrer ? input.referrer.slice(0, 300) : null,
  });

  if (error) return { error: error.message };
  return { ok: true as const };
}
