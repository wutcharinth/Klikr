// AI credit system — per-feature costs, monthly grants per tier, top-up packages.
//
// While FREE_FOR_ALL is true, consumeCredits succeeds even when the balance is
// zero — but it still logs the usage so we can see what users would consume
// once the flag is flipped.

import { createClient } from "@/lib/supabase/server";
import { FREE_FOR_ALL } from "@/lib/plans";
import type { PlanTier } from "@/lib/types";
import type { AIRoute } from "@/lib/ai";

// Cost per AI call. Roughly mirrors expected token usage — bigger calls cost
// more credits. 1 credit ≈ 1 cent of Haiku-4.5 spend at the helper's prices.
export const CREDIT_COSTS: Record<AIRoute, number> = {
  "generate-presentation": 5,
  "suggest-options": 1,
  "summarize-responses": 3,
  "cluster-wordcloud": 2,
  "recommend-templates": 1,
};

export const MONTHLY_CREDITS: Record<PlanTier, number> = {
  free: 0,
  basic: 10,
  pro: 200,
};

export const TOPUP_PACKAGES = [
  { id: "small", credits: 50, usd: 1.99, label: "Starter" },
  { id: "medium", credits: 250, usd: 7.99, label: "Power user" },
  { id: "large", credits: 1000, usd: 19.99, label: "Heavy user" },
] as const;

/** Refresh monthly grants if a new month started, return current balance. */
export async function refreshAndGetBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ai_grant_monthly_credits", { p_user_id: userId });
  if (error) {
    // Fall back to a direct read if the RPC isn't available yet.
    const { data: p } = await supabase
      .from("profiles")
      .select("ai_credits_remaining")
      .eq("id", userId)
      .maybeSingle();
    return p?.ai_credits_remaining ?? 0;
  }
  return Number(data ?? 0);
}

export type ConsumeResult =
  | { ok: true; balanceAfter: number; cost: number; freebie: boolean }
  | { ok: false; reason: "insufficient"; balance: number; cost: number };

export async function consumeCredits(userId: string, route: AIRoute): Promise<ConsumeResult> {
  const cost = CREDIT_COSTS[route];

  if (FREE_FOR_ALL) {
    // Don't enforce limits, but still try to grant + decrement so the meter is honest.
    const supabase = await createClient();
    await supabase.rpc("ai_grant_monthly_credits", { p_user_id: userId });
    const { data: balance } = await supabase.rpc("ai_consume_credits", { p_user_id: userId, p_amount: cost });
    if (typeof balance === "number" && balance >= 0) {
      return { ok: true, balanceAfter: balance, cost, freebie: false };
    }
    return { ok: true, balanceAfter: 0, cost, freebie: true };
  }

  await refreshAndGetBalance(userId);
  const supabase = await createClient();
  const { data: balance } = await supabase.rpc("ai_consume_credits", {
    p_user_id: userId,
    p_amount: cost,
  });
  if (typeof balance === "number" && balance >= 0) {
    return { ok: true, balanceAfter: balance, cost, freebie: false };
  }
  const { data: p } = await supabase
    .from("profiles")
    .select("ai_credits_remaining")
    .eq("id", userId)
    .maybeSingle();
  return {
    ok: false,
    reason: "insufficient",
    balance: p?.ai_credits_remaining ?? 0,
    cost,
  };
}
