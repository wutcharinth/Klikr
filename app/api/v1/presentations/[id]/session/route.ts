import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  action: z.enum(["start", "next", "prev", "end", "goto"]),
  slide_id: z.string().uuid().optional(),
});

/**
 * Drive a presentation's runtime state from an external client. Mirrors the
 * web app's server actions but without a session cookie.
 *
 *   POST /api/v1/presentations/{id}/session   { "action": "start" }
 *   POST /api/v1/presentations/{id}/session   { "action": "next" }
 *   POST /api/v1/presentations/{id}/session   { "action": "goto", "slide_id": "…" }
 */
export async function POST(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: pres } = await svc
    .from("presentations")
    .select("id, owner_id, state, current_slide_id")
    .eq("id", id)
    .maybeSingle();
  if (!pres || pres.owner_id !== auth.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: slides } = await svc
    .from("slides")
    .select("id, position")
    .eq("presentation_id", id)
    .order("position", { ascending: true });
  const ordered = slides ?? [];

  let updates: { state?: string; current_slide_id?: string | null; current_slide_started_at?: string | null } = {};

  switch (parsed.data.action) {
    case "start": {
      if (ordered.length === 0) return NextResponse.json({ error: "No slides." }, { status: 400 });
      updates = { state: "active", current_slide_id: ordered[0].id, current_slide_started_at: new Date().toISOString() };
      break;
    }
    case "end": {
      updates = { state: "closed" };
      break;
    }
    case "next":
    case "prev": {
      const idx = ordered.findIndex((s) => s.id === pres.current_slide_id);
      const target = parsed.data.action === "next" ? idx + 1 : idx - 1;
      if (idx < 0 || target < 0 || target >= ordered.length) {
        return NextResponse.json({ error: "Out of range." }, { status: 400 });
      }
      updates = { current_slide_id: ordered[target].id, current_slide_started_at: new Date().toISOString() };
      break;
    }
    case "goto": {
      const slideId = parsed.data.slide_id;
      if (!slideId || !ordered.some((s) => s.id === slideId)) {
        return NextResponse.json({ error: "slide_id not in this presentation." }, { status: 400 });
      }
      updates = { current_slide_id: slideId, current_slide_started_at: new Date().toISOString() };
      break;
    }
  }

  const { data, error } = await svc
    .from("presentations")
    .update(updates)
    .eq("id", id)
    .select("id, title, code, state, current_slide_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presentation: data });
}
