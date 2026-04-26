// Plan tiers and feature gating.
//
// While FREE_FOR_ALL is true, every gate returns true regardless of the user's
// plan_tier. To switch on real gating after the 1000-user threshold:
//   1. Set FREE_FOR_ALL=false on Railway.
//   2. Grandfather existing users:
//        update profiles set plan_tier='pro' where created_at < <cutoff>;
//   3. Hook a billing flow up to update profiles.plan_tier going forward.

import { createClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/types";

export const FREE_FOR_ALL = process.env.FREE_FOR_ALL !== "false";

export type Feature =
  | "custom_branding"
  | "export_pdf"
  | "export_xlsx"
  | "embed_slides"
  | "team_editors"
  | "templates_create"
  | "import_slides"
  | "moderate_qa"
  | "ai_features";

type Limits = Record<Feature, boolean> & {
  participants_per_month: number;
  slides_per_pres: number;
  quiz_slides: number;
};

const inf = Number.POSITIVE_INFINITY;

// Pricing once we exit the free-for-all phase. Aggressively undercutting
// Mentimeter ($11.99/$24.99), Slido ($8/$16), Polls Everywhere ($14/$34) —
// the indie / small-team alternative.
//   Free:  $0  — try it forever, hit a soft cap.
//   Basic: $2 — runs your regular sessions, no walls.
//   Pro:   $5 — Basic + AI superpowers.
export const PRICES = {
  free: 0,
  basic: 1.99,
  pro: 4.99,
} as const;

export const PLAN_LIMITS: Record<PlanTier, Limits> = {
  // Generous enough to fall in love. Tight enough to upgrade.
  free: {
    participants_per_month: 100,
    slides_per_pres: 5,
    quiz_slides: 5,
    custom_branding: false,
    export_pdf: false,
    export_xlsx: false,
    embed_slides: false,
    team_editors: false,
    templates_create: false,
    import_slides: false,
    moderate_qa: false,
    ai_features: false,
  },
  // Removes every wall except AI.
  basic: {
    participants_per_month: inf,
    slides_per_pres: inf,
    quiz_slides: inf,
    custom_branding: true,
    export_pdf: true,
    export_xlsx: true,
    embed_slides: true,
    team_editors: true,
    templates_create: true,
    import_slides: true,
    moderate_qa: true,
    ai_features: false,
  },
  // AI superpowers + 200 credits/month + analytics depth.
  pro: {
    participants_per_month: inf,
    slides_per_pres: inf,
    quiz_slides: inf,
    custom_branding: true,
    export_pdf: true,
    export_xlsx: true,
    embed_slides: true,
    team_editors: true,
    templates_create: true,
    import_slides: true,
    moderate_qa: true,
    ai_features: true,
  },
};

export async function getUserPlan(): Promise<PlanTier> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "free";
  const { data } = await supabase.from("profiles").select("plan_tier").eq("id", u.user.id).maybeSingle();
  return ((data?.plan_tier as PlanTier) ?? "pro");
}

export async function can(feature: Feature): Promise<boolean> {
  if (FREE_FOR_ALL) return true;
  const tier = await getUserPlan();
  return PLAN_LIMITS[tier][feature] === true;
}

export async function limit(feature: "participants_per_month" | "slides_per_pres" | "quiz_slides"): Promise<number> {
  if (FREE_FOR_ALL) return inf;
  const tier = await getUserPlan();
  return PLAN_LIMITS[tier][feature];
}
