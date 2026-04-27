import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

const PatchBody = z.object({
  question: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().nonnegative().optional(),
  image_url: z.string().url().nullable().optional(),
  kahoot_mode: z.boolean().optional(),
});

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const svc = createServiceClient();
  const slide = await fetchOwnedSlide(svc, id, auth.userId);
  if (!slide) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ slide });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json ?? {});
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const svc = createServiceClient();
  const exists = await fetchOwnedSlide(svc, id, auth.userId);
  if (!exists) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data, error } = await svc
    .from("slides")
    .update(parsed.data)
    .eq("id", id)
    .select("id, presentation_id, position, type, question, config, image_url, kahoot_mode, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slide: data });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const svc = createServiceClient();
  const exists = await fetchOwnedSlide(svc, id, auth.userId);
  if (!exists) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { error } = await svc.from("slides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

async function fetchOwnedSlide(svc: ReturnType<typeof createServiceClient>, id: string, userId: string) {
  // Join presentations to verify ownership without a separate round-trip.
  const { data } = await svc
    .from("slides")
    .select("id, presentation_id, position, type, question, config, image_url, kahoot_mode, created_at, presentations!inner(owner_id)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // PostgREST returns the joined row inline; check ownership then strip it.
  const ownerId = (data as unknown as { presentations: { owner_id: string } }).presentations?.owner_id;
  if (ownerId !== userId) return null;
  return {
    id: data.id,
    presentation_id: data.presentation_id,
    position: data.position,
    type: data.type,
    question: data.question,
    config: data.config,
    image_url: data.image_url,
    kahoot_mode: data.kahoot_mode,
    created_at: data.created_at,
  };
}
