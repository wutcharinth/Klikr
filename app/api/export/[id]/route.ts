import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return new Response("Unauthorized", { status: 401 });

  const { data: presentation } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", id)
    .single();
  if (!presentation || presentation.owner_id !== userData.user.id) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: slides }, { data: participants }, { data: responses }, { data: votes }] = await Promise.all([
    supabase.from("slides").select("*").eq("presentation_id", id).order("position"),
    supabase.from("participants").select("*").eq("presentation_id", id),
    supabase
      .from("responses")
      .select("*, slides!inner(presentation_id)")
      .eq("slides.presentation_id", id),
    supabase
      .from("question_votes")
      .select("response_id, participant_id"),
  ]);

  const lines: string[] = [];
  // Header
  lines.push(["section", "slide_position", "slide_type", "slide_question", "participant", "score", "value_text", "value_index", "response_ms", "upvotes", "created_at"].join(","));

  // Participants
  for (const p of participants ?? []) {
    lines.push(["participant", "", "", "", csvEscape(p.nickname), csvEscape(p.score), "", "", "", "", csvEscape(p.created_at)].join(","));
  }

  // Responses
  const slideById = new Map((slides ?? []).map((s) => [s.id, s]));
  const partById = new Map((participants ?? []).map((p) => [p.id, p]));
  const voteCounts = new Map<string, number>();
  for (const v of votes ?? []) voteCounts.set(v.response_id, (voteCounts.get(v.response_id) ?? 0) + 1);

  for (const r of responses ?? []) {
    const s = slideById.get(r.slide_id);
    const p = partById.get(r.participant_id);
    lines.push([
      "response",
      csvEscape(s?.position ?? ""),
      csvEscape(s?.type ?? ""),
      csvEscape(s?.question ?? ""),
      csvEscape(p?.nickname ?? ""),
      csvEscape(p?.score ?? ""),
      csvEscape(r.value_text ?? ""),
      csvEscape(r.value_index ?? ""),
      csvEscape(r.response_ms ?? ""),
      csvEscape(voteCounts.get(r.id) ?? 0),
      csvEscape(r.created_at),
    ].join(","));
  }

  const csv = lines.join("\n");
  const safe = (presentation.title || "klikr").replace(/[^a-z0-9-_]+/gi, "_");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safe}-${presentation.code}.csv"`,
    },
  });
}
