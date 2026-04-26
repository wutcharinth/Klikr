"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");
  // Best-effort upsert. If the `profiles` table doesn't exist yet (migrations
  // not applied), don't block the user — just send them through.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: u.user.id, onboarded_at: new Date().toISOString() });
  if (error) console.warn("completeOnboarding: profiles upsert failed:", error.message);
  redirect("/dashboard");
}
