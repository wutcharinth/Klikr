import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, generate, logUsage, parseJson, rateLimitOk, withinMonthlyCap } from "@/lib/ai";
import { can } from "@/lib/plans";
import { consumeCredits } from "@/lib/credits";

const ReqSchema = z.object({
  slide_id: z.string().uuid(),
  refresh: z.boolean().optional(),
});

const SummarySchema = z.object({
  themes: z.array(z.object({ label: z.string().max(60), count: z.number().int().min(1), example: z.string().optional() })).max(8),
  sentiment: z.enum(["positive", "mixed", "negative", "neutral"]).optional(),
  flags: z.array(z.string()).optional(),
});

const SAMPLE_SIZE = 200;

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

  // Owner check
  const { data: slide } = await supabase
    .from("slides")
    .select("id, presentation_id, type, question")
    .eq("id", body.slide_id)
    .maybeSingle();
  if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
  const { data: pres } = await supabase
    .from("presentations")
    .select("owner_id")
    .eq("id", slide.presentation_id)
    .single();
  if (pres?.owner_id !== u.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cache hit?
  const { data: responses, count } = await supabase
    .from("responses")
    .select("value_text", { count: "exact" })
    .eq("slide_id", body.slide_id)
    .not("value_text", "is", null);
  const responseCount = count ?? 0;
  if (responseCount === 0) return NextResponse.json({ themes: [], sentiment: "neutral", flags: [] });

  if (!body.refresh) {
    const { data: cached } = await supabase
      .from("slide_ai_summaries")
      .select("summary, last_response_count")
      .eq("slide_id", body.slide_id)
      .maybeSingle();
    if (cached?.summary && cached.last_response_count === responseCount) {
      return NextResponse.json(cached.summary);
    }
  }

  const credits = await consumeCredits(u.user.id, "summarize-responses");
  if (!credits.ok) {
    return NextResponse.json(
      { error: `Out of AI credits. Need ${credits.cost}, have ${credits.balance}.` },
      { status: 402 }
    );
  }

  // Sample if too many
  let sampled = (responses ?? []).map((r) => r.value_text).filter(Boolean) as string[];
  if (sampled.length > SAMPLE_SIZE) {
    for (let i = sampled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sampled[i], sampled[j]] = [sampled[j], sampled[i]];
    }
    sampled = sampled.slice(0, SAMPLE_SIZE);
  }

  const system = `You analyse audience responses from live polls. Given a question and a list of free-text answers, return JSON with:
- "themes": up to 6 distinct themes with a short label (under 6 words), a count of how many responses fit, and one short representative quote.
- "sentiment": overall sentiment — "positive", "mixed", "negative", or "neutral".
- "flags": empty array unless responses include profanity, harassment, PII, or clear off-topic spam — then list short reasons.

The list may be a sample of a larger set. Total response count: {N}. Sample size shown to you: {S}.

Return ONLY JSON.`;

  const user = `Question: ${slide.question}\n\nResponses:\n${sampled.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
  const finalSystem = system.replace("{N}", String(responseCount)).replace("{S}", String(sampled.length));

  const result = await generate({
    system: finalSystem,
    user,
    maxTokens: 600,
    cacheSystem: false,
    prefill: "{",
  });
  await logUsage({ userId: u.user.id, route: "summarize-responses", result, credits: credits.cost });

  let summary: z.infer<typeof SummarySchema>;
  try {
    summary = SummarySchema.parse(parseJson(result.text));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid AI output";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await supabase.from("slide_ai_summaries").upsert({
    slide_id: body.slide_id,
    summary,
    last_response_count: responseCount,
    generated_at: new Date().toISOString(),
  });

  return NextResponse.json(summary);
}
