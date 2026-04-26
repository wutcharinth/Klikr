"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mintApiKey } from "@/lib/apiAuth";

/**
 * Mint a new API key. The plaintext is shown to the user exactly once via
 * a query param, then never again (we only persist the hash).
 */
export async function createApiKey(formData: FormData) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const label = String(formData.get("label") ?? "Untitled key").trim().slice(0, 80) || "Untitled key";

  const { plaintext, hash, prefix } = mintApiKey();
  const svc = createServiceClient();
  const { error } = await svc.from("api_keys").insert({
    user_id: u.user.id,
    label,
    key_hash: hash,
    prefix,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/api-keys");
  redirect(`/dashboard/api-keys?new=${encodeURIComponent(plaintext)}`);
}

export async function revokeApiKey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const svc = createServiceClient();
  await svc
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", u.user.id);

  revalidatePath("/dashboard/api-keys");
}
