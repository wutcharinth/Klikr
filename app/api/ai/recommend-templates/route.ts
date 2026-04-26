import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, generate, logUsage, parseJson, rateLimitOk, withinMonthlyCap } from "@/lib/ai";
import { can } from "@/lib/plans";
import { consumeCredits } from "@/lib/credits";

const ReqSchema = z.object({ intent: z.string().min(2).max(200) });

const ResponseSchema = z.object({
  slugs: z.array(z.string().min(1).max(80)).min(1).max(3),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await can("ai_features"))) return NextResponse.json({ error: "Pro feature" }, { status: 402 });
  if (!rateLimitOk(u.user.id)) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  if (!(await withinMonthlyCap())) return NextResponse.json({ error: "AI budget reached" }, { status: 429 });

  let body: z.infer<typeof ReqSchema>;
  try {
    body = ReqSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const credits = await consumeCredits(u.user.id, "recommend-templates");
  if (!credits.ok) {
    return NextResponse.json(
      { error: `Out of AI credits. Need ${credits.cost}, have ${credits.balance}.` },
      { status: 402 }
    );
  }

  const { data: tpls } = await supabase
    .from("templates")
    .select("slug, title, category, description, tags")
    .eq("visibility", "public");

  const list = (tpls ?? [])
    .map((t) => `- ${t.slug}: ${t.title} (${t.category}) — ${t.description}`)
    .join("\n");

  const system = `You match user intents to presentation templates from a fixed catalog.

Catalog:
${list}

Given a one-line meeting intent, return JSON with the 1–3 most relevant slugs and a short reason.

Return ONLY JSON: { "slugs": ["slug-1","slug-2","slug-3"], "reason": "string" }`;

  const result = await generate({
    system,
    user: body.intent,
    maxTokens: 200,
    cacheSystem: true,
    prefill: "{",
  });
  await logUsage({ userId: u.user.id, route: "recommend-templates", result, credits: credits.cost });

  let out: z.infer<typeof ResponseSchema>;
  try {
    out = ResponseSchema.parse(parseJson(result.text));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid AI output";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Filter to slugs that actually exist
  const valid = new Set((tpls ?? []).map((t) => t.slug));
  out.slugs = out.slugs.filter((s) => valid.has(s));
  return NextResponse.json(out);
}
