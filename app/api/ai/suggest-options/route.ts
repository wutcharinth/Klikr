import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, generate, logUsage, parseJson, rateLimitOk, withinMonthlyCap } from "@/lib/ai";
import { can } from "@/lib/plans";
import { consumeCredits } from "@/lib/credits";

const ReqSchema = z.object({
  question: z.string().min(2).max(300),
  type: z.enum(["mcq", "quiz"]),
  count: z.number().int().min(2).max(6).optional(),
});

const McqSchema = z.object({ options: z.array(z.string().min(1).max(80)).min(2).max(6) });
const QuizSchema = z.object({
  options: z.array(z.string().min(1).max(80)).length(4),
  correct_index: z.number().int().min(0).max(3),
});

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await can("ai_features"))) return NextResponse.json({ error: "Pro feature" }, { status: 402 });
  if (!rateLimitOk(u.user.id)) return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  if (!(await withinMonthlyCap())) return NextResponse.json({ error: "AI budget reached" }, { status: 429 });

  const credits = await consumeCredits(u.user.id, "suggest-options");
  if (!credits.ok) {
    return NextResponse.json(
      { error: `Out of AI credits. Need ${credits.cost}, have ${credits.balance}.` },
      { status: 402 }
    );
  }

  let body: z.infer<typeof ReqSchema>;
  try {
    body = ReqSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = body.count ?? 4;
  const system = body.type === "quiz"
    ? `You write quiz questions for live audience engagement. Given a quiz question, return JSON with exactly 4 plausible options and the index of the correct one. Make the wrong options non-trivial. Return ONLY JSON: {"options":["...","...","...","..."],"correct_index":0}`
    : `You write multiple-choice poll options. Given a poll question, return ${count} short, distinct options that cover plausible answers. Return ONLY JSON: {"options":["...","..."]}`;

  const result = await generate({
    system,
    user: body.question,
    maxTokens: 250,
    cacheSystem: true,
    prefill: "{",
  });
  await logUsage({ userId: u.user.id, route: "suggest-options", result, credits: credits.cost });

  try {
    if (body.type === "quiz") {
      const out = QuizSchema.parse(parseJson(result.text));
      return NextResponse.json(out);
    } else {
      const out = McqSchema.parse(parseJson(result.text));
      return NextResponse.json(out);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI returned invalid output";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
