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
  // getSession() reads the cookie locally (~0ms) vs getUser() which round-
  // trips to Supabase Auth (~200ms). RLS on the profiles update enforces
  // identity, so we don't need a verified user here — just an authenticated
  // cookie and the user id from it.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", session.user.id);
  if (error) console.warn("completeOnboarding: profiles update failed:", error.message);
  redirect("/dashboard");
}
