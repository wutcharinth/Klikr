import type { SupabaseClient } from "@supabase/supabase-js";
import { generateRoomCode } from "@/lib/code";
import { startedAtFor } from "@/lib/liveTiming";
import { normalizeSlide, SLIDE_INPUT_SCHEMA, SlideInputError, type StoredSlide } from "./slideInput";

// Klikr MCP tools. Authoring tools build and maintain decks (quizzes, polls,
// surveys); live tools drive a running session and read results. Handlers get
// an authenticated user id and a Supabase client; when that client is the
// service role (API-key auth) RLS doesn't apply, so every handler checks
// access to the presentation itself.

export type ToolContext = {
  db: SupabaseClient;
  userId: string;
  origin: string;
};

/** A failure the caller can fix — returned to the client as a tool error. */
export class ToolError extends Error {}

const MAX_SLIDES_PER_CALL = 50;
const SLIDE_COLS = "id, position, type, question, config, kahoot_mode, image_url";

type SlideRow = {
  id: string;
  position: number;
  type: StoredSlide["type"];
  question: string;
  config: StoredSlide["config"];
  kahoot_mode: boolean | null;
  image_url: string | null;
};

const id = (description: string) => ({ type: "string", description });

export const TOOLS = [
  {
    name: "klikr_list_presentations",
    title: "List presentations",
    description: "List the decks you own or co-edit, newest first, with their slide counts and room codes.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "klikr_get_presentation",
    title: "Get a presentation",
    description:
      "Get one deck with every slide (id, type, question, options, correct answer, settings) in order. Call this before editing so you have the slide ids.",
    inputSchema: {
      type: "object",
      properties: { presentation_id: id("Presentation id from klikr_list_presentations.") },
      required: ["presentation_id"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "klikr_create_presentation",
    title: "Create a presentation",
    description:
      "Create a new deck, optionally with all its slides in one call (up to 50) — the fastest way to build a whole quiz or survey. Returns the deck id, room code, slide ids and edit/present/join links.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", maxLength: 200, description: "Deck title." },
        slides: { type: "array", items: SLIDE_INPUT_SCHEMA, maxItems: MAX_SLIDES_PER_CALL, description: "Slides in order." },
      },
      required: ["title"],
    },
  },
  {
    name: "klikr_update_presentation",
    title: "Rename a presentation",
    description: "Change a deck's title.",
    inputSchema: {
      type: "object",
      properties: { presentation_id: id("Presentation id."), title: { type: "string", maxLength: 200 } },
      required: ["presentation_id", "title"],
    },
    annotations: { idempotentHint: true },
  },
  {
    name: "klikr_duplicate_presentation",
    title: "Duplicate a presentation",
    description:
      "Copy a deck and all its slides into a new deck with a fresh room code (no responses or players are copied). Handy for re-running a quiz with a new group.",
    inputSchema: {
      type: "object",
      properties: {
        presentation_id: id("Deck to copy."),
        title: { type: "string", maxLength: 200, description: 'Title for the copy (default: "<title> (copy)").' },
      },
      required: ["presentation_id"],
    },
  },
  {
    name: "klikr_add_slides",
    title: "Add slides",
    description:
      "Add up to 50 slides to a deck in one call. By default they go at the end; pass `position` (1-based) to insert them before that slide.",
    inputSchema: {
      type: "object",
      properties: {
        presentation_id: id("Presentation id."),
        slides: { type: "array", items: SLIDE_INPUT_SCHEMA, minItems: 1, maxItems: MAX_SLIDES_PER_CALL },
        position: { type: "integer", minimum: 1, description: "1-based slide number to insert before. Omit to append." },
      },
      required: ["presentation_id", "slides"],
    },
  },
  {
    name: "klikr_add_slide",
    title: "Add one slide",
    description: "Add a single slide (same fields as one entry of klikr_add_slides). Prefer klikr_add_slides for several.",
    inputSchema: {
      type: "object",
      properties: {
        presentation_id: id("Presentation id."),
        ...SLIDE_INPUT_SCHEMA.properties,
        config: { type: "object", description: "Legacy raw config; prefer the named fields." },
        position: { type: "integer", minimum: 1, description: "1-based slide number to insert before. Omit to append." },
      },
      required: ["presentation_id", "type"],
    },
  },
  {
    name: "klikr_update_slide",
    title: "Edit a slide",
    description:
      "Change a slide's question and/or settings. Only the fields you pass change. A slide's type can't change. If you replace a quiz's options, also pass correct_answer.",
    inputSchema: {
      type: "object",
      properties: {
        slide_id: id("Slide id from klikr_get_presentation."),
        ...Object.fromEntries(Object.entries(SLIDE_INPUT_SCHEMA.properties).filter(([k]) => k !== "type")),
      },
      required: ["slide_id"],
    },
    annotations: { idempotentHint: true },
  },
  {
    name: "klikr_delete_slide",
    title: "Delete a slide",
    description: "Delete a slide and any responses to it. Refuses the slide currently on screen in a live session.",
    inputSchema: { type: "object", properties: { slide_id: id("Slide id.") }, required: ["slide_id"] },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  {
    name: "klikr_reorder_slides",
    title: "Reorder slides",
    description: "Put a deck's slides in a new order. Pass every slide id of the deck exactly once, in the order you want.",
    inputSchema: {
      type: "object",
      properties: {
        presentation_id: id("Presentation id."),
        slide_ids: { type: "array", items: { type: "string" }, description: "All of the deck's slide ids, in the new order." },
      },
      required: ["presentation_id", "slide_ids"],
    },
    annotations: { idempotentHint: true },
  },
  {
    name: "klikr_advance_slide",
    title: "Advance the live session",
    description:
      "Move a running session to the next (or previous) slide. From the lobby this starts the session on slide 1. Direction defaults to 'next'.",
    inputSchema: {
      type: "object",
      properties: { presentation_id: id("Presentation id."), direction: { type: "string", enum: ["next", "prev"] } },
      required: ["presentation_id"],
    },
  },
  {
    name: "klikr_end_presentation",
    title: "End the live session",
    description: "Close a running session. Audiences see their final results and the podium.",
    inputSchema: { type: "object", properties: { presentation_id: id("Presentation id.") }, required: ["presentation_id"] },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  {
    name: "klikr_get_responses",
    title: "Get slide responses",
    description: "Fetch every response to one slide. Q&A responses include their upvote counts.",
    inputSchema: { type: "object", properties: { slide_id: id("Slide id.") }, required: ["slide_id"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "klikr_get_leaderboard",
    title: "Get the leaderboard",
    description: "Fetch a session's players sorted by quiz score, highest first.",
    inputSchema: { type: "object", properties: { presentation_id: id("Presentation id.") }, required: ["presentation_id"] },
    annotations: { readOnlyHint: true },
  },
] as const;

export type ToolName = (typeof TOOLS)[number]["name"];
const TOOL_NAMES = new Set<string>(TOOLS.map((t) => t.name));
export const isToolName = (n: string): n is ToolName => TOOL_NAMES.has(n);

export const SERVER_INSTRUCTIONS = `Klikr runs live audience sessions: quizzes, polls, surveys, word clouds, Q&A, ratings and rankings. People join on their phones with a room code.

Building decks:
- Create a whole deck in one call: klikr_create_presentation with a "slides" array.
- Slide types: quiz (scored, one right answer), mcq (poll), wordcloud, open (free text), qa (audience questions), rating, ranking, embed.
- Quiz slides: give the right answer as "correct_answer" with the exact option text. Game-mode quizzes (the default) show at most 4 options; set game_mode: false for more. Add an "explanation" to teach after the reveal.
- Surveys: use mcq, rating, ranking, open and wordcloud slides.

Editing: call klikr_get_presentation first to get slide ids, then klikr_update_slide / klikr_add_slides / klikr_delete_slide / klikr_reorder_slides. Validation errors say exactly what to fix.

Every deck has edit_url (web editor), present_url (big screen for the host) and join_url (for the audience).`;

// ---------------------------------------------------------------------------

export async function callTool(name: ToolName, rawArgs: unknown, ctx: ToolContext): Promise<unknown> {
  const args = (rawArgs && typeof rawArgs === "object" ? rawArgs : {}) as Record<string, unknown>;
  switch (name) {
    case "klikr_list_presentations":
      return listPresentations(ctx);
    case "klikr_get_presentation":
      return getPresentation(ctx, str(args, "presentation_id"));
    case "klikr_create_presentation":
      return createPresentation(ctx, args);
    case "klikr_update_presentation":
      return updatePresentation(ctx, str(args, "presentation_id"), title(args.title));
    case "klikr_duplicate_presentation":
      return duplicatePresentation(ctx, str(args, "presentation_id"), args.title);
    case "klikr_add_slides":
      return addSlides(ctx, str(args, "presentation_id"), args.slides, args.position);
    case "klikr_add_slide": {
      const { presentation_id, position, ...slide } = args;
      void presentation_id;
      return addSlides(ctx, str(args, "presentation_id"), [slide], position);
    }
    case "klikr_update_slide":
      return updateSlide(ctx, args);
    case "klikr_delete_slide":
      return deleteSlide(ctx, str(args, "slide_id"));
    case "klikr_reorder_slides":
      return reorderSlides(ctx, str(args, "presentation_id"), args.slide_ids);
    case "klikr_advance_slide":
      return advanceSlide(ctx, str(args, "presentation_id"), args.direction);
    case "klikr_end_presentation":
      return endPresentation(ctx, str(args, "presentation_id"));
    case "klikr_get_responses":
      return getResponses(ctx, str(args, "slide_id"));
    case "klikr_get_leaderboard":
      return getLeaderboard(ctx, str(args, "presentation_id"));
  }
}

// --- helpers ----------------------------------------------------------------

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== "string" || !v.trim()) throw new ToolError(`"${key}" is required.`);
  return v.trim();
}

function title(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw new ToolError(`"title" is required.`);
  const t = v.trim();
  if (t.length > 200) throw new ToolError(`"title" is ${t.length} characters; the limit is 200.`);
  return t;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function links(origin: string, presId: string, code: string) {
  return {
    edit_url: `${origin}/edit/${presId}`,
    present_url: `${origin}/present/${presId}`,
    join_url: `${origin}/play/${code}`,
  };
}

function slideOut(s: SlideRow, number: number) {
  const out: Record<string, unknown> = { id: s.id, number, type: s.type, question: s.question, ...s.config };
  if (s.type === "quiz") {
    const cfg = s.config as { options?: string[]; correct_index?: number };
    out.correct_answer = cfg.options?.[cfg.correct_index ?? -1] ?? null;
    out.game_mode = Boolean(s.kahoot_mode);
  }
  if (s.image_url) out.image_url = s.image_url;
  return out;
}

type PresRow = { id: string; owner_id: string; title: string; code: string; state: string; current_slide_id: string | null };

async function requirePresentation(ctx: ToolContext, presId: string): Promise<PresRow & { role: "owner" | "editor" }> {
  const { data, error } = await ctx.db
    .from("presentations")
    .select("id, owner_id, title, code, state, current_slide_id")
    .eq("id", presId)
    .maybeSingle<PresRow>();
  // An invalid uuid surfaces as a query error — treat it as not found.
  if (error || !data) throw new ToolError(`No presentation with id "${presId}". Use klikr_list_presentations to find it.`);
  if (data.owner_id === ctx.userId) return { ...data, role: "owner" };
  const { data: editor } = await ctx.db
    .from("presentation_editors")
    .select("user_id")
    .eq("presentation_id", presId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!editor) throw new ToolError(`No presentation with id "${presId}". Use klikr_list_presentations to find it.`);
  return { ...data, role: "editor" };
}

async function requireSlide(ctx: ToolContext, slideId: string) {
  const { data, error } = await ctx.db
    .from("slides")
    .select(`presentation_id, ${SLIDE_COLS}`)
    .eq("id", slideId)
    .maybeSingle<SlideRow & { presentation_id: string }>();
  if (error || !data) throw new ToolError(`No slide with id "${slideId}". Use klikr_get_presentation to list slide ids.`);
  const pres = await requirePresentation(ctx, data.presentation_id);
  return { slide: data, pres };
}

async function loadSlides(ctx: ToolContext, presId: string): Promise<SlideRow[]> {
  const { data, error } = await ctx.db
    .from("slides")
    .select(SLIDE_COLS)
    .eq("presentation_id", presId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<SlideRow[]>();
  fail(error);
  return data ?? [];
}

function parseSlides(input: unknown): StoredSlide[] {
  if (!Array.isArray(input) || input.length === 0) throw new ToolError(`"slides" must be a non-empty list.`);
  if (input.length > MAX_SLIDES_PER_CALL) {
    throw new ToolError(`At most ${MAX_SLIDES_PER_CALL} slides per call (got ${input.length}). Split them across calls.`);
  }
  return input.map((s, i) => normalizeSlide(s, undefined, `slides[${i}]`));
}

async function insertPresentation(ctx: ToolContext, row: Record<string, unknown>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await ctx.db
      .from("presentations")
      .insert({ ...row, owner_id: ctx.userId, code })
      .select("id, code")
      .single<{ id: string; code: string }>();
    if (!error && data) return data;
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not generate a unique room code. Try again.");
}

/** Insert stored slides at `before` (0-based index into the current order). */
async function insertSlides(ctx: ToolContext, presId: string, slides: StoredSlide[], before?: number) {
  const existing = await loadSlides(ctx, presId);
  const at = before === undefined ? existing.length : Math.min(Math.max(0, before), existing.length);
  // Renumber 0..n-1 so the new slides slot in cleanly; only touch rows that move.
  const moves = existing
    .map((s, i) => ({ id: s.id, pos: i < at ? i : i + slides.length, old: s.position }))
    .filter((m) => m.pos !== m.old);
  await Promise.all(
    moves.map(async (m) => fail((await ctx.db.from("slides").update({ position: m.pos }).eq("id", m.id)).error)),
  );
  const { data, error } = await ctx.db
    .from("slides")
    .insert(slides.map((s, i) => ({ presentation_id: presId, position: at + i, ...s })))
    .select("id, position, type, question")
    .returns<{ id: string; position: number; type: string; question: string }[]>();
  fail(error);
  return {
    added: (data ?? [])
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.id, number: s.position + 1, type: s.type, question: s.question })),
    slide_count: existing.length + slides.length,
  };
}

// --- authoring --------------------------------------------------------------

async function listPresentations(ctx: ToolContext) {
  const [owned, shared] = await Promise.all([
    ctx.db
      .from("presentations")
      .select("id, title, code, state, created_at")
      .eq("owner_id", ctx.userId)
      .order("created_at", { ascending: false }),
    ctx.db.from("presentation_editors").select("presentation_id").eq("user_id", ctx.userId),
  ]);
  fail(owned.error);
  const sharedIds = (shared.data ?? []).map((r) => r.presentation_id as string);
  const sharedRows = sharedIds.length
    ? (await ctx.db.from("presentations").select("id, title, code, state, created_at").in("id", sharedIds)).data ?? []
    : [];
  const rows = [
    ...(owned.data ?? []).map((p) => ({ ...p, role: "owner" })),
    ...sharedRows.map((p) => ({ ...p, role: "editor" })),
  ];
  const ids = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: slides } = await ctx.db.from("slides").select("presentation_id").in("presentation_id", ids);
    for (const s of slides ?? []) counts.set(s.presentation_id, (counts.get(s.presentation_id) ?? 0) + 1);
  }
  return {
    presentations: rows.map((r) => ({
      id: r.id,
      title: r.title,
      code: r.code,
      state: r.state,
      role: r.role,
      slide_count: counts.get(r.id) ?? 0,
      created_at: r.created_at,
    })),
  };
}

async function getPresentation(ctx: ToolContext, presId: string) {
  const pres = await requirePresentation(ctx, presId);
  const slides = await loadSlides(ctx, presId);
  return {
    id: pres.id,
    title: pres.title,
    code: pres.code,
    state: pres.state,
    role: pres.role,
    ...links(ctx.origin, pres.id, pres.code),
    slides: slides.map((s, i) => slideOut(s, i + 1)),
  };
}

async function createPresentation(ctx: ToolContext, args: Record<string, unknown>) {
  const t = title(args.title);
  // Validate every slide before writing anything.
  const slides = args.slides === undefined ? [] : parseSlides(args.slides);
  const pres = await insertPresentation(ctx, { title: t });
  let added: Awaited<ReturnType<typeof insertSlides>>["added"] = [];
  if (slides.length) {
    try {
      added = (await insertSlides(ctx, pres.id, slides)).added;
    } catch (e) {
      // Don't leave a half-built deck behind.
      await ctx.db.from("presentations").delete().eq("id", pres.id);
      throw e;
    }
  }
  return { id: pres.id, title: t, code: pres.code, ...links(ctx.origin, pres.id, pres.code), slides: added };
}

async function updatePresentation(ctx: ToolContext, presId: string, newTitle: string) {
  const pres = await requirePresentation(ctx, presId);
  fail((await ctx.db.from("presentations").update({ title: newTitle }).eq("id", presId)).error);
  return { id: pres.id, title: newTitle };
}

async function duplicatePresentation(ctx: ToolContext, presId: string, rawTitle: unknown) {
  const src = await requirePresentation(ctx, presId);
  const newTitle = rawTitle === undefined ? `${src.title} (copy)`.slice(0, 200) : title(rawTitle);
  const [{ data: theme }, { data: slides, error: slidesErr }] = await Promise.all([
    ctx.db.from("presentations").select("theme").eq("id", presId).single<{ theme: unknown }>(),
    ctx.db
      .from("slides")
      .select("position, type, question, config, image_url, image_credit, kahoot_mode")
      .eq("presentation_id", presId)
      .order("position", { ascending: true }),
  ]);
  fail(slidesErr);
  const copy = await insertPresentation(ctx, { title: newTitle, theme: theme?.theme ?? null });
  if (slides && slides.length) {
    const { error } = await ctx.db.from("slides").insert(slides.map((s) => ({ ...s, presentation_id: copy.id })));
    if (error) {
      await ctx.db.from("presentations").delete().eq("id", copy.id);
      throw new Error(error.message);
    }
  }
  return { id: copy.id, title: newTitle, code: copy.code, slide_count: slides?.length ?? 0, ...links(ctx.origin, copy.id, copy.code) };
}

async function addSlides(ctx: ToolContext, presId: string, rawSlides: unknown, rawPosition: unknown) {
  const slides = parseSlides(rawSlides);
  let before: number | undefined;
  if (rawPosition !== undefined && rawPosition !== null) {
    if (typeof rawPosition !== "number" || !Number.isInteger(rawPosition) || rawPosition < 1) {
      throw new ToolError(`"position" must be a whole number, 1 or more (1 = insert before the first slide).`);
    }
    before = rawPosition - 1;
  }
  await requirePresentation(ctx, presId);
  return insertSlides(ctx, presId, slides, before);
}

async function updateSlide(ctx: ToolContext, args: Record<string, unknown>) {
  const slideId = str(args, "slide_id");
  const { slide_id, ...fields } = args;
  void slide_id;
  if (Object.values(fields).every((v) => v === undefined)) {
    throw new ToolError("Nothing to change — pass the fields to update (e.g. question, options, correct_answer).");
  }
  const { slide } = await requireSlide(ctx, slideId);
  const base: StoredSlide = {
    type: slide.type,
    question: slide.question,
    config: slide.config,
    kahoot_mode: Boolean(slide.kahoot_mode),
  };
  const next = normalizeSlide(fields, base, "slide");
  const { data, error } = await ctx.db
    .from("slides")
    .update({ question: next.question, config: next.config, kahoot_mode: next.kahoot_mode })
    .eq("id", slideId)
    .select(SLIDE_COLS)
    .single<SlideRow>();
  fail(error);
  const all = await loadSlides(ctx, slide.presentation_id);
  return { updated: slideOut(data!, all.findIndex((s) => s.id === slideId) + 1) };
}

async function deleteSlide(ctx: ToolContext, slideId: string) {
  const { slide, pres } = await requireSlide(ctx, slideId);
  if (pres.state === "active" && pres.current_slide_id === slideId) {
    throw new ToolError("That slide is on screen in a live session. Advance past it (klikr_advance_slide) before deleting it.");
  }
  fail((await ctx.db.from("slides").delete().eq("id", slideId)).error);
  const rest = await loadSlides(ctx, slide.presentation_id);
  await Promise.all(
    rest
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => s.position !== i)
      .map(async ({ s, i }) => fail((await ctx.db.from("slides").update({ position: i }).eq("id", s.id)).error)),
  );
  return { deleted: slideId, slide_count: rest.length };
}

async function reorderSlides(ctx: ToolContext, presId: string, rawIds: unknown) {
  if (!Array.isArray(rawIds) || rawIds.some((x) => typeof x !== "string")) {
    throw new ToolError(`"slide_ids" must be a list of slide ids.`);
  }
  const ids = rawIds as string[];
  await requirePresentation(ctx, presId);
  const current = await loadSlides(ctx, presId);
  const known = new Set(current.map((s) => s.id));
  const given = new Set(ids);
  const missing = current.filter((s) => !given.has(s.id)).map((s) => s.id);
  const extra = ids.filter((i) => !known.has(i));
  if (given.size !== ids.length || missing.length || extra.length) {
    throw new ToolError(
      `"slide_ids" must list each of the deck's ${current.length} slides exactly once.` +
        (missing.length ? ` Missing: ${missing.join(", ")}.` : "") +
        (extra.length ? ` Not in this deck: ${extra.join(", ")}.` : "") +
        (given.size !== ids.length ? " Some ids are repeated." : ""),
    );
  }
  const pos = new Map(current.map((s) => [s.id, s.position]));
  await Promise.all(
    ids
      .map((sid, i) => ({ sid, i }))
      .filter(({ sid, i }) => pos.get(sid) !== i)
      .map(async ({ sid, i }) => fail((await ctx.db.from("slides").update({ position: i }).eq("id", sid)).error)),
  );
  const byId = new Map(current.map((s) => [s.id, s]));
  return { order: ids.map((sid, i) => ({ number: i + 1, id: sid, question: byId.get(sid)!.question })) };
}

// --- live session & results ---------------------------------------------------

async function advanceSlide(ctx: ToolContext, presId: string, rawDirection: unknown) {
  const direction = rawDirection === "prev" ? "prev" : "next";
  const pres = await requirePresentation(ctx, presId);
  const slides = await loadSlides(ctx, presId);
  if (slides.length === 0) throw new ToolError("This deck has no slides yet.");
  if (pres.state === "closed") throw new ToolError("This session has ended.");
  let next: SlideRow;
  if (pres.state === "lobby") {
    next = slides[0];
  } else {
    const idx = slides.findIndex((s) => s.id === pres.current_slide_id);
    const nextIdx = direction === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= slides.length) {
      throw new ToolError(direction === "next" ? "Already on the last slide." : "Already on the first slide.");
    }
    next = slides[nextIdx];
  }
  fail(
    (
      await ctx.db
        .from("presentations")
        .update({ state: "active", current_slide_id: next.id, current_slide_started_at: startedAtFor(next.type) })
        .eq("id", presId)
    ).error,
  );
  return { current_slide: slideOut(next, slides.indexOf(next) + 1), of: slides.length };
}

async function endPresentation(ctx: ToolContext, presId: string) {
  await requirePresentation(ctx, presId);
  fail((await ctx.db.from("presentations").update({ state: "closed" }).eq("id", presId)).error);
  return { state: "closed" };
}

async function getResponses(ctx: ToolContext, slideId: string) {
  const { slide } = await requireSlide(ctx, slideId);
  const { data: responses, error } = await ctx.db
    .from("responses")
    .select("id, value_text, value_index, response_ms, created_at, participant_id")
    .eq("slide_id", slideId)
    .order("created_at", { ascending: true });
  fail(error);
  const ids = (responses ?? []).map((r) => r.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: votes } = await ctx.db.from("question_votes").select("response_id").in("response_id", ids);
    for (const v of votes ?? []) counts.set(v.response_id, (counts.get(v.response_id) ?? 0) + 1);
  }
  return {
    slide: { id: slide.id, type: slide.type, question: slide.question },
    responses: (responses ?? []).map((r) => ({ ...r, upvotes: counts.get(r.id) ?? 0 })),
  };
}

async function getLeaderboard(ctx: ToolContext, presId: string) {
  await requirePresentation(ctx, presId);
  const { data, error } = await ctx.db
    .from("participants")
    .select("nickname, score, created_at")
    .eq("presentation_id", presId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true });
  fail(error);
  return { players: (data ?? []).map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score })) };
}

export { SlideInputError };
