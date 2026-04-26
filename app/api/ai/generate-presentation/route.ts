import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, generate, logUsage, parseJson, rateLimitOk, withinMonthlyCap } from "@/lib/ai";
import { generateRoomCode } from "@/lib/code";
import { can } from "@/lib/plans";
import { consumeCredits } from "@/lib/credits";

const PromptSchema = z.object({ prompt: z.string().min(3).max(500) });

const SlideSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mcq"), question: z.string(), options: z.array(z.string()).min(2).max(6) }),
  z.object({ type: z.literal("wordcloud"), question: z.string(), max_words_per_participant: z.number().int().min(1).max(5).optional() }),
  z.object({ type: z.literal("open"), question: z.string() }),
  z.object({
    type: z.literal("quiz"),
    question: z.string(),
    options: z.array(z.string()).min(2).max(4),
    correct_index: z.number().int().min(0).max(3),
    time_limit_s: z.number().int().min(5).max(60).optional(),
  }),
  z.object({ type: z.literal("qa"), question: z.string(), upvotes: z.boolean().optional() }),
  z.object({
    type: z.literal("rating"),
    question: z.string(),
    scale: z.union([z.literal(5), z.literal(10)]),
    min_label: z.string().optional(),
    max_label: z.string().optional(),
  }),
]);

const DeckSchema = z.object({
  title: z.string().min(1).max(80),
  slides: z.array(SlideSchema).min(1).max(6),
});

const SYSTEM = `You are a presentation designer for Klikr — a live audience-engagement tool.

Given a one-line meeting description, produce a JSON deck with 3–6 short, punchy slides.

Slide types you can use:
- "mcq": multiple choice poll. Provide 2–6 options.
- "wordcloud": single open word/phrase from each participant.
- "open": open-ended text response.
- "quiz": competitive timed quiz. 2–4 options, exactly one correct_index, time_limit_s 15–30.
- "qa": Q&A — audience asks questions and upvotes.
- "rating": 5-point or 10-point scale, optional min_label / max_label.

Style:
- Questions are concise (under 15 words). Conversational, second person.
- Mix slide types unless the prompt clearly asks for one kind (e.g. "5-question quiz").
- For business/retro contexts, lean on rating + open + qa.
- For education contexts, use quiz.
- For brainstorming, use wordcloud + open.
- For icebreakers, use mcq + open + rating.
- Don't restate the meeting topic in every question.

Return ONLY JSON, no prose, matching this exact schema:
{
  "title": "string",
  "slides": [
    { "type": "mcq", "question": "...", "options": ["A","B","C"] },
    { "type": "wordcloud", "question": "...", "max_words_per_participant": 1 },
    { "type": "open", "question": "..." },
    { "type": "quiz", "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "time_limit_s": 20 },
    { "type": "qa", "question": "...", "upvotes": true },
    { "type": "rating", "question": "...", "scale": 5, "min_label": "Low", "max_label": "High" }
  ]
}`;

export async function POST(req: Request) {
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI not configured. Add GOOGLE_GENAI_API_KEY to enable." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await can("ai_features"))) {
    return NextResponse.json({ error: "AI is a Pro feature." }, { status: 402 });
  }
  if (!rateLimitOk(u.user.id)) {
    return NextResponse.json({ error: "Too many AI calls. Try again in a minute." }, { status: 429 });
  }
  if (!(await withinMonthlyCap())) {
    return NextResponse.json({ error: "AI monthly budget reached. Try again next month." }, { status: 429 });
  }

  let body: { prompt: string };
  try {
    body = PromptSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
  }

  const credits = await consumeCredits(u.user.id, "generate-presentation");
  if (!credits.ok) {
    return NextResponse.json(
      { error: `Out of AI credits. Need ${credits.cost}, have ${credits.balance}. Top up at /credits.` },
      { status: 402 }
    );
  }

  const result = await generate({
    system: SYSTEM,
    user: body.prompt,
    maxTokens: 1500,
    cacheSystem: true,
    prefill: "{",
  });
  await logUsage({ userId: u.user.id, route: "generate-presentation", result, credits: credits.cost });

  let deck: z.infer<typeof DeckSchema>;
  try {
    deck = DeckSchema.parse(parseJson(result.text));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid AI output";
    return NextResponse.json({ error: `AI returned invalid JSON: ${message}` }, { status: 502 });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data: pres, error: pErr } = await supabase
      .from("presentations")
      .insert({ owner_id: u.user.id, title: deck.title, code })
      .select("id")
      .single();
    if (pErr) {
      if (pErr.code === "23505") continue;
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const rows = deck.slides.map((s, i) => {
      const base = { presentation_id: pres.id, position: i, type: s.type, question: s.question };
      switch (s.type) {
        case "mcq":
          return { ...base, config: { options: s.options } };
        case "wordcloud":
          return { ...base, config: { max_words_per_participant: s.max_words_per_participant ?? 1 } };
        case "open":
          return { ...base, config: {} };
        case "quiz":
          return {
            ...base,
            config: { options: s.options, correct_index: s.correct_index, time_limit_s: s.time_limit_s ?? 20 },
            kahoot_mode: true,
          };
        case "qa":
          return { ...base, config: { upvotes: s.upvotes ?? true } };
        case "rating":
          return { ...base, config: { scale: s.scale, min_label: s.min_label, max_label: s.max_label } };
      }
    });

    const { error: sErr } = await supabase.from("slides").insert(rows);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    return NextResponse.json({ presentation_id: pres.id, title: deck.title, slide_count: rows.length });
  }

  return NextResponse.json({ error: "Could not generate unique room code" }, { status: 500 });
}
