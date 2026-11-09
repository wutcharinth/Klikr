import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One service-role client per server process. The client is stateless for our
// purposes (no session persistence, no token refresh), so reusing it avoids
// re-creating fetch/realtime plumbing on every server-action call.
let cached: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for trusted server operations.");
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
