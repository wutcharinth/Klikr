import { NextRequest } from "next/server";
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
  quizScores: { slide_id: string; participant_id: string; points: number }[];
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

  const [{ data: slides }, { data: participants }, { data: responses }] = await Promise.all([
    supabase.from("slides").select("id, position, type, question").eq("presentation_id", id).order("position"),
    supabase.from("participants").select("id, nickname, score, created_at").eq("presentation_id", id),
    supabase
      .from("responses")
      .select("id, slide_id, participant_id, value_text, value_index, response_ms, created_at, slides!inner(presentation_id)")
      .eq("slides.presentation_id", id),
  ]);

  const responseIds = ((responses ?? []) as { id: string }[]).map((r) => r.id);
  const { data: votes } = responseIds.length
    ? await supabase.from("question_votes").select("response_id, participant_id").in("response_id", responseIds)
    : { data: [] as { response_id: string }[] };

  const voteCounts = new Map<string, number>();
  for (const v of (votes ?? []) as { response_id: string }[]) {
    voteCounts.set(v.response_id, (voteCounts.get(v.response_id) ?? 0) + 1);
  }

  // Per-question scores (one row per participant per quiz slide). Powers the
  // per-participant x per-question score sheet.
  const quizSlideIds = (slides ?? []).filter((s) => s.type === "quiz").map((s) => s.id);
  const { data: quizScores } = quizSlideIds.length
    ? await supabase.from("quiz_slide_scores").select("slide_id, participant_id, points").in("slide_id", quizSlideIds)
    : { data: [] as ExportData["quizScores"] };

  return {
    presentation,
    slides: slides ?? [],
    participants: participants ?? [],
    responses: (responses ?? []) as ExportData["responses"],
    quizScores: (quizScores ?? []) as ExportData["quizScores"],
    voteCounts,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv") as "csv" | "xlsx" | "pdf" | "scores";

  const data = await loadData(id);
  if (!data) return new Response("Not found", { status: 404 });

  // Per-participant x per-question score sheet — CSV (opens in Excel), free.
  if (format === "scores") return scoresCsvResponse(data);

  if (format === "xlsx") {
    if (!(await can("export_xlsx"))) {
      return new Response("Excel export is a Basic feature.", { status: 402 });
    }
    return await xlsxResponse(data);
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

// Per-participant x per-question score matrix: one row per participant, one
// column per quiz slide (in slide order), plus a Total. Sorted high-to-low.
function buildScoreMatrix(
  slides: ExportData["slides"],
  participants: ExportData["participants"],
  quizScores: ExportData["quizScores"],
): { header: string[]; rows: (string | number)[][] } {
  const quizSlides = slides.filter((s) => s.type === "quiz").sort((a, b) => a.position - b.position);
  const scoreByKey = new Map<string, number>();
  for (const qs of quizScores) scoreByKey.set(`${qs.slide_id}:${qs.participant_id}`, qs.points);

  const header = [
    "Participant",
    ...quizSlides.map((s, i) => (s.question ? `Q${i + 1}: ${s.question}`.slice(0, 80) : `Q${i + 1}`)),
    "Total",
  ];
  const sorted = [...participants].sort(
    (a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const rows = sorted.map((p) => {
    const cells = quizSlides.map((s) => scoreByKey.get(`${s.id}:${p.id}`) ?? 0);
    const total = cells.reduce((sum, n) => sum + n, 0);
    return [p.nickname, ...cells, total];
  });
  return { header, rows };
}

function scoresCsvResponse(data: ExportData): Response {
  const { header, rows } = buildScoreMatrix(data.slides, data.participants, data.quizScores);
  const lines = [header.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  const safe = (data.presentation.title || "klikr").replace(/[^a-z0-9-_]+/gi, "_");
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safe}-${data.presentation.code}-scores.csv"`,
    },
  });
}

async function xlsxResponse({ presentation, slides, participants, responses, quizScores, voteCounts }: ExportData): Promise<Response> {
  const sheets: { name: string; rows: unknown[][] }[] = [
    {
      name: "Summary",
      rows: [
        ["Title", presentation.title],
        ["Code", presentation.code],
        ["Slides", slides.length],
        ["Participants", participants.length],
        ["Responses", responses.length],
      ],
    },
    {
      name: "Participants",
      rows: [
        ["Nickname", "Score", "JoinedAt"],
        ...participants.map((p) => [p.nickname, p.score, p.created_at]),
      ],
    },
  ];

  // Per-participant x per-question score sheet.
  const scoreMatrix = buildScoreMatrix(slides, participants, quizScores);
  if (scoreMatrix.rows.length > 0) {
    sheets.push({ name: "Scores", rows: [scoreMatrix.header, ...scoreMatrix.rows] });
  }

  const partById = new Map(participants.map((p) => [p.id, p]));
  for (const s of slides) {
    const slideRows = responses.filter((r) => r.slide_id === s.id);
    sheets.push({
      name: `${String(s.position + 1).padStart(2, "0")}. ${s.type}`.slice(0, 31),
      rows: [
        [s.question || `Slide ${s.position + 1}`],
        [],
        ["Participant", "Text", "OptionIndex", "ResponseMs", "Upvotes", "CreatedAt"],
        ...(slideRows.length === 0
          ? [["(no responses)"]]
          : slideRows.map((r) => {
              const p = partById.get(r.participant_id);
              return [
                p?.nickname ?? "",
                r.value_text ?? "",
                r.value_index ?? "",
                r.response_ms ?? "",
                voteCounts.get(r.id) ?? 0,
                r.created_at,
              ];
            })),
      ],
    });
  }

  const buffer = makeXlsx(sheets);
  const safe = (presentation.title || "klikr").replace(/[^a-z0-9-_]+/gi, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${safe}-${presentation.code}.xlsx"`,
    },
  });
}

function makeXlsx(sheets: { name: string; rows: unknown[][] }[]): Buffer {
  const sheetDefs = sheets.map((s, i) => ({ ...s, id: i + 1 }));
  const entries = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetDefs.map((s) => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetDefs.map((s) => `<sheet name="${escapeHtml(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join("")}</sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetDefs.map((s) => `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`).join("")}
</Relationships>`,
    },
    ...sheetDefs.map((s) => ({
      name: `xl/worksheets/sheet${s.id}.xml`,
      data: sheetXml(s.rows),
    })),
  ];

  return zip(entries.map((e) => ({ name: e.name, data: Buffer.from(e.data, "utf8") })));
}

function sheetXml(rows: unknown[][]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows.map((row, rIdx) => `<row r="${rIdx + 1}">${row.map((value, cIdx) => cellXml(value, cIdx, rIdx)).join("")}</row>`).join("")}
  </sheetData>
</worksheet>`;
}

function cellXml(value: unknown, col: number, row: number): string {
  const ref = `${columnName(col)}${row + 1}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeHtml(String(value ?? ""))}</t></is></c>`;
}

function columnName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function zip(entries: { name: string; data: Buffer }[]): Buffer {
  const files: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    files.push(local, name, entry.data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(entry.data.length, 20);
    dir.writeUInt32LE(entry.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += local.length + name.length + entry.data.length;
  }

  const centralSize = central.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...files, ...central, end]);
}

const CRC_TABLE = new Uint32Array(256).map((_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
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
