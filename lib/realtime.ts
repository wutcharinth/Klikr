"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Emoji reactions travel over Realtime Broadcast: ephemeral, no DB row per tap
// (they used to be INSERTs on `reactions`, fanned out via postgres_changes).
export const REACTION_EVENT = "reaction";
export const REACTION_EMOJI = ["👏", "❤️", "🎉", "😂", "🔥", "💡"] as const;

export function reactionChannelName(presentationId: string): string {
  return `reactions:${presentationId}`;
}

/**
 * Pin the signed-in user's JWT on the realtime socket before subscribing.
 * Without it a channel can join as `anon`, and RLS-gated postgres_changes
 * (participants, reactions — "owners and editors" policies) silently deliver
 * nothing even though the channel reports SUBSCRIBED.
 */
export async function pinRealtimeAuth(supabase: SupabaseClient): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) await supabase.realtime.setAuth(token);
  } catch {
    /* anonymous — fine for public channels */
  }
}
