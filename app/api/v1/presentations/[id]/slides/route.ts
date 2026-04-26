import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

const SLIDE_TYPES = ["mcq", "wordcloud", "open", "quiz", "qa", "rating", "embed", "ranking"] as const;

const CreateBody = z.object({
  type: z.enum(SLIDE_TYPES),
  question: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().nonnegative().optional(),
});

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const svc = createServiceClient();
  const owns = await ownsPresentation(svc, id, auth.userId);
  if (!owns) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data, error } = await svc
    .from("slides")
    .select("id, presentation_id, position, type, question, config, image_url, kahoot_mode, created_at")
    .eq("presentation_id", id)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slides: data ?? [] });
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
  }

  const svc = createServiceClient();
  const owns = await ownsPresentation(svc, id, auth.userId);
  if (!owns) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // If position not supplied, append to the end.
  let position = parsed.data.position;
  if (position === undefined) {
    const { data: last } = await svc
      .from("slides")
      .select("position")
      .eq("presentation_id", id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = (last?.position ?? -1) + 1;
  }

  const { data, error } = await svc
    .from("slides")
    .insert({
      presentation_id: id,
      type: parsed.data.type,
      question: parsed.data.question ?? "",
      config: parsed.data.config ?? {},
      position,
    })
    .select("id, presentation_id, position, type, question, config, image_url, kahoot_mode, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slide: data }, { status: 201 });
}

async function ownsPresentation(svc: ReturnType<typeof createServiceClient>, id: string, userId: string) {
  const { data } = await svc.from("presentations").select("owner_id").eq("id", id).maybeSingle();
  return !!data && data.owner_id === userId;
}
