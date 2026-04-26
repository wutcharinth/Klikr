import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { generateRoomCode } from "@/lib/code";

const CreateBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("presentations")
    .select("id, title, code, state, current_slide_id, created_at")
    .eq("owner_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presentations: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
  }

  const svc = createServiceClient();

  // The `code` column has a unique constraint. Random 6-char codes are
  // unlikely to collide, but retry a few times rather than 500ing.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await svc
      .from("presentations")
      .insert({
        owner_id: auth.userId,
        title: parsed.data.title ?? "Untitled",
        code: generateRoomCode(),
      })
      .select("id, title, code, state, current_slide_id, created_at")
      .single();

    if (!error) return NextResponse.json({ presentation: data }, { status: 201 });
    if (!error.message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Could not allocate a unique room code." }, { status: 500 });
}
