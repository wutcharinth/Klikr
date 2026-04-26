import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/plans";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

type ExportData = {
  presentation: { id: string; title: string; code: string; owner_id: string };
  slides: { id: string; position: number; type: string; question: string }[];
  participants: { id: string; nickname: string; score: number; created_at: string }[];
  responses: {
    id: string;
    slide_id: string;
    participant_id: string;
    value_text: string | null;
    value_index: number | null;
    response_ms: number | null;
    created_at: string;
  }[];
  voteCounts: Map<string, number>;
};

async function loadData(id: string): Promise<ExportData | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, title, code, owner_id")
    .eq("id", id)
    .single();
  if (!presentation || presentation.owner_id !== userData.user.id) return null;

  const [{ data: slides }, { data: participants }, { data: responses }, { data: votes }] = await Promise.all([
    supabase.from("slides").select("id, position, type, question").eq("presentation_id", id).order("position"),
    supabase.from("participants").select("id, nickname, score, created_at").eq("presentation_id", id),
    supabase
      .from("responses")
      .select("id, slide_id, participant_id, value_text, value_index, response_ms, created_at, slides!inner(presentation_id)")
      .eq("slides.presentation_id", id),
    supabase.from("question_votes").select("response_id, participant_id"),
  ]);

  const voteCounts = new Map<string, number>();
  for (const v of (votes ?? []) as { response_id: string }[]) {
    voteCounts.set(v.response_id, (voteCounts.get(v.response_id) ?? 0) + 1);
  }

  return {
    presentation,
    slides: slides ?? [],
    participants: participants ?? [],
    responses: (responses ?? []) as ExportData["responses"],
    voteCounts,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv") as "csv" | "xlsx" | "pdf";

  const data = await loadData(id);
  if (!data) return new Response("Not found", { status: 404 });

  if (format === "xlsx") {
    if (!(await can("export_xlsx"))) {
      return new Response("Excel export is a Basic feature.", { status: 402 });
    }
    return xlsxResponse(data);
  }
  if (format === "pdf") {
    if (!(await can("export_pdf"))) {
      return new Response("PDF export is a Basic feature.", { status: 402 });
    }
    return pdfResponse(data);
  }
  return csvResponse(data);
}

function csvResponse({ presentation, slides, participants, responses, voteCounts }: ExportData): Response {
  const lines: string[] = [];
  lines.push(
    ["section", "slide_position", "slide_type", "slide_question", "participant", "score", "value_text", "value_index", "response_ms", "upvotes", "created_at"].join(",")
  );
  for (const p of participants) {
    lines.push(["participant", "", "", "", csvEscape(p.nickname), csvEscape(p.score), "", "", "", "", csvEscape(p.created_at)].join(","));
  }
  const slideById = new Map(slides.map((s) => [s.id, s]));
  const partById = new Map(participants.map((p) => [p.id, p]));
  for (const r of responses) {
    const s = slideById.get(r.slide_id);
    const p = partById.get(r.participant_id);
    lines.push(
      [
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
      ].join(",")
    );
  }
  const safe = (presentation.title || "klikr").replace(/[^a-z0-9-_]+/gi, "_");
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safe}-${presentation.code}.csv"`,
    },
  });
}

function xlsxResponse({ presentation, slides, participants, responses, voteCounts }: ExportData): Response {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summary = [
    ["Title", presentation.title],
    ["Code", presentation.code],
    ["Slides", slides.length],
    ["Participants", participants.length],
    ["Responses", responses.length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  // Participants sheet
  const partSheet = participants.map((p) => ({
    Nickname: p.nickname,
    Score: p.score,
    JoinedAt: p.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partSheet), "Participants");

  // One sheet per slide
  const partById = new Map(participants.map((p) => [p.id, p]));
  for (const s of slides) {
    const rows = responses
      .filter((r) => r.slide_id === s.id)
      .map((r) => {
        const p = partById.get(r.participant_id);
        return {
          Participant: p?.nickname ?? "",
          Text: r.value_text ?? "",
          OptionIndex: r.value_index ?? "",
          ResponseMs: r.response_ms ?? "",
          Upvotes: voteCounts.get(r.id) ?? 0,
          CreatedAt: r.created_at,
        };
      });
    const name = `${String(s.position + 1).padStart(2, "0")}. ${s.type}`.slice(0, 31);
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Participant: "(no responses)" }]);
    // Put question text at top
    XLSX.utils.sheet_add_aoa(ws, [[s.question || `Slide ${s.position + 1}`]], { origin: "A1" });
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const safe = (presentation.title || "klikr").replace(/[^a-z0-9-_]+/gi, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${safe}-${presentation.code}.xlsx"`,
    },
  });
}

function pdfResponse({ presentation, slides, participants, responses }: ExportData): Response {
  // Simple printable HTML — use the browser's "Save as PDF" via print stylesheet.
  // Avoids the heavy @react-pdf/renderer pipeline for v1.
  const partById = new Map(participants.map((p) => [p.id, p]));
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(presentation.title)} — Klikr results</title>
<style>
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1d1d1f; max-width: 720px; margin: 24px auto; padding: 0 24px; }
  h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: -0.022em; }
  h2 { font-size: 18px; margin: 28px 0 8px; }
  .meta { color: #6e6e73; font-size: 12px; }
  ul, ol { padding-left: 18px; }
  li { margin: 4px 0; }
  .empty { color: #6e6e73; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12px; }
  th, td { border-bottom: 1px solid #e0e0e0; padding: 6px 8px; text-align: left; }
  @media print { body { margin: 0 } }
</style>
</head>
<body>
<h1>${escapeHtml(presentation.title)}</h1>
<p class="meta">Code: ${escapeHtml(presentation.code)} · ${slides.length} slides · ${participants.length} participants · ${responses.length} responses</p>
${slides
  .map((s) => {
    const slideResponses = responses.filter((r) => r.slide_id === s.id);
    return `
<h2>${s.position + 1}. ${escapeHtml(s.question || s.type)} <span class="meta">(${s.type})</span></h2>
${
  slideResponses.length === 0
    ? '<p class="empty">No responses.</p>'
    : `<table><thead><tr><th>Participant</th><th>Answer</th></tr></thead><tbody>${slideResponses
        .map((r) => {
          const p = partById.get(r.participant_id);
          const v = r.value_text ?? (r.value_index !== null ? `Option #${r.value_index + 1}` : "");
          return `<tr><td>${escapeHtml(p?.nickname ?? "")}</td><td>${escapeHtml(String(v))}</td></tr>`;
        })
        .join("")}</tbody></table>`
}
`;
  })
  .join("")}
<script>window.onload = function(){ try { window.print(); } catch(e){} }</script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
