import { cache } from "react";
import { createClient } from "./server";
import { isAdminEmail } from "@/lib/admin";

export type CurrentUser = { id: string; email: string | null };

/**
 * Per-request memoised identity lookup, shared by a page and the NavBar it
 * renders.
 *
 * Uses `auth.getClaims()`, which verifies the session JWT. With the project's
 * asymmetric signing keys that happens locally (no network); with legacy
 * symmetric keys supabase-js falls back to asking the Auth server, i.e. the
 * same cost as `getUser()`. Either way the identity is verified, not just
 * decoded from the cookie.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user: CurrentUser | null = claims?.sub
    ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null }
    : null;
  return { supabase, user };
});

/** Per-request memoised admin check (env allow-list, then profiles.is_admin). */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const { supabase, user } = await getCurrentUser();
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return Boolean(data?.is_admin);
});
