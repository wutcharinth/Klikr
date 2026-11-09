import { cache } from "react";
import { createClient } from "./server";

/**
 * Per-request memoised `auth.getUser()`. A page and the NavBar it renders both
 * need the user; without this each one pays its own Supabase Auth round trip.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
});
