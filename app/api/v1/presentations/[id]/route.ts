import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

const PatchBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  state: z.enum(["lobby", "active", "closed"]).optional(),
});

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("presentations")
    .select("id, title, code, state, current_slide_id, created_at, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.owner_id !== auth.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const presentation = {
    id: data.id,
    title: data.title,
    code: data.code,
    state: data.state,
    current_slide_id: data.current_slide_id,
    created_at: data.created_at,
  };
  return NextResponse.json({ presentation });
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
  const { data, error } = await svc
    .from("presentations")
    .update(parsed.data)
    .eq("id", id)
    .eq("owner_id", auth.userId)
    .select("id, title, code, state, current_slide_id, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ presentation: data });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { id } = await params;

  const svc = createServiceClient();
  const { error, count } = await svc
    .from("presentations")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
