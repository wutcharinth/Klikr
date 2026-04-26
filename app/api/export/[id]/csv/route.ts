import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  "slide_position",
  "slide_type",
  "slide_question",
  "participant_nickname",
  "value_index",
  "value_text",
  "response_ms",
  "status",
  "flagged",
  "upvote_count",
  "created_at",
];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pres } = await supabase
    .from("presentations")
    .select("id, owner_id, title, code")
    .eq("id", id)
    .maybeSingle();
  if (!pres || pres.owner_id !== u.user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { data: slides } = await supabase
    .from("slides")
    .select("id, position, type, question")
    .eq("presentation_id", id)
    .order("position", { ascending: true });

  const slideMap = new Map((slides ?? []).map((s) => [s.id, s]));
  const slideIds = (slides ?? []).map((s) => s.id);

  const { data: responses } = slideIds.length
    ? await supabase
        .from("responses")
        .select("id, slide_id, participant_id, value_text, value_index, response_ms, status, flagged, created_at")
        .in("slide_id", slideIds)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; slide_id: string; participant_id: string; value_text: string | null; value_index: number | null; response_ms: number | null; status: string | null; flagged: boolean | null; created_at: string }[] };

  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: votes } = responseIds.length
    ? await supabase.from("question_votes").select("response_id").in("response_id", responseIds)
    : { data: [] as { response_id: string }[] };
  const voteCounts = new Map<string, number>();
  for (const v of votes ?? []) voteCounts.set(v.response_id, (voteCounts.get(v.response_id) ?? 0) + 1);

  const participantIds = [...new Set((responses ?? []).map((r) => r.participant_id))];
  const { data: participants } = participantIds.length
    ? await supabase.from("participants").select("id, nickname").in("id", participantIds)
    : { data: [] as { id: string; nickname: string }[] };
  const nicknameById = new Map((participants ?? []).map((p) => [p.id, p.nickname]));

  const lines: string[] = [HEADERS.join(",")];
  for (const r of responses ?? []) {
    const slide = slideMap.get(r.slide_id);
    if (!slide) continue;
    lines.push([
      slide.position,
      slide.type,
      slide.question,
      nicknameById.get(r.participant_id) ?? "",
      r.value_index ?? "",
      r.value_text ?? "",
      r.response_ms ?? "",
      r.status ?? "approved",
      r.flagged ? "true" : "false",
      voteCounts.get(r.id) ?? 0,
      r.created_at,
    ].map(csvEscape).join(","));
  }
  const body = lines.join("\n");

  const safeTitle = (pres.title || "presentation").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
  const filename = `${safeTitle}-${pres.code}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
