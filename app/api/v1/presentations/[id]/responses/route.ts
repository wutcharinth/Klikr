import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const url = new URL(req.url);
  const slideId = url.searchParams.get("slide_id");

  const svc = createServiceClient();
  const { data: pres } = await svc.from("presentations").select("owner_id").eq("id", id).maybeSingle();
  if (!pres || pres.owner_id !== auth.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Look up the presentation's slide IDs once, then filter responses.
  const { data: slides } = await svc.from("slides").select("id").eq("presentation_id", id);
  const slideIds = (slides ?? []).map((s) => s.id);
  if (slideIds.length === 0) return NextResponse.json({ responses: [] });

  let q = svc
    .from("responses")
    .select("id, slide_id, value_index, value_text, status, flagged, created_at")
    .in("slide_id", slideIds)
    .order("created_at", { ascending: true });

  if (slideId) q = q.eq("slide_id", slideId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responses: data ?? [] });
}
