import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, generate, logUsage, parseJson, rateLimitOk, withinMonthlyCap } from "@/lib/ai";
import { can } from "@/lib/plans";
import { consumeCredits } from "@/lib/credits";

const ReqSchema = z.object({ slide_id: z.string().uuid(), refresh: z.boolean().optional() });

const ClusterSchema = z.object({
  groups: z.array(z.object({
    label: z.string().min(1).max(40),
    members: z.array(z.string()),
    count: z.number().int().min(1),
  })).max(40),
});

const SAMPLE_SIZE = 300;

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

  const { data: slide } = await supabase
    .from("slides")
    .select("id, presentation_id, type")
    .eq("id", body.slide_id)
    .maybeSingle();
  if (!slide) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
  if (slide.type !== "wordcloud") return NextResponse.json({ error: "Only word cloud slides" }, { status: 400 });
  const { data: pres } = await supabase.from("presentations").select("owner_id").eq("id", slide.presentation_id).single();
  if (pres?.owner_id !== u.user.id) {
    const { data: editor } = await supabase
      .from("presentation_editors")
      .select("user_id")
      .eq("presentation_id", slide.presentation_id)
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!editor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rows, count } = await supabase
    .from("responses")
    .select("value_text", { count: "exact" })
    .eq("slide_id", body.slide_id)
    .not("value_text", "is", null);
  const responseCount = count ?? 0;
  if (responseCount === 0) return NextResponse.json({ groups: [] });

  if (!body.refresh) {
    const { data: cached } = await supabase
      .from("slide_ai_summaries")
      .select("cluster_data, last_response_count")
      .eq("slide_id", body.slide_id)
      .maybeSingle();
    if (cached?.cluster_data && cached.last_response_count === responseCount) {
      return NextResponse.json(cached.cluster_data);
    }
  }

  const credits = await consumeCredits(u.user.id, "cluster-wordcloud");
  if (!credits.ok) {
    return NextResponse.json(
      { error: `Out of AI credits. Need ${credits.cost}, have ${credits.balance}.` },
      { status: 402 }
    );
  }

  let words = (rows ?? []).map((r) => r.value_text!.trim()).filter(Boolean);
  if (words.length > SAMPLE_SIZE) {
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    words = words.slice(0, SAMPLE_SIZE);
  }

  const system = `You group word-cloud submissions into synonym clusters. For each cluster, pick the clearest representative as the label, list every member exactly as submitted, and a count.

Return ONLY JSON: { "groups": [ { "label": "string", "members": ["..."], "count": N } ] }`;

  const result = await generate({
    system,
    user: words.join(", "),
    maxTokens: 800,
    cacheSystem: true,
    prefill: "{",
  });
  await logUsage({ userId: u.user.id, route: "cluster-wordcloud", result, credits: credits.cost });

  let cluster: z.infer<typeof ClusterSchema>;
  try {
    cluster = ClusterSchema.parse(parseJson(result.text));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid AI output";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await supabase.from("slide_ai_summaries").upsert({
    slide_id: body.slide_id,
    cluster_data: cluster,
    last_response_count: responseCount,
    generated_at: new Date().toISOString(),
  });

  return NextResponse.json(cluster);
}
