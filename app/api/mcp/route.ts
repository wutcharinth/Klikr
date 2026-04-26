import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { generateRoomCode } from "@/lib/code";
import type { SlideType, SlideConfig } from "@/lib/types";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Klikr Model Context Protocol server.
 *
 * Single endpoint at POST /api/mcp. Implements the JSON-RPC 2.0 subset of MCP
 * required for tool discovery + invocation, with Bearer-token auth backed by
 * the same Supabase access tokens the web app uses. No SSE streaming: each
 * request returns a single JSON response.
 *
 * Auth: clients must send `Authorization: Bearer <supabase_access_token>`.
 *       Get one by signing in on the web (Google) and copying the
 *       `sb-<project>-auth-token` cookie value, or via the Supabase JS client.
 */

const SERVER_INFO = { name: "klikr", version: "0.1.0" };

const TOOLS = [
  {
    name: "klikr_create_presentation",
    description: "Create a new Klikr presentation. Returns the id, the room code audiences will type, and edit/present URLs.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", description: "Title of the presentation." } },
      required: ["title"],
    },
  },
  {
    name: "klikr_add_slide",
    description: "Append a slide to a presentation. type is one of 'mcq' | 'wordcloud' | 'open' | 'quiz' | 'qa' | 'rating' | 'ranking'. Pass type-specific config (options, items, time_limit_s, scale, etc.) or omit it to use sensible defaults.",
    inputSchema: {
      type: "object",
      properties: {
        presentation_id: { type: "string" },
        type: { type: "string", enum: ["mcq", "wordcloud", "open", "quiz", "qa", "rating", "ranking"] },
        question: { type: "string" },
        config: { type: "object" },
      },
      required: ["presentation_id", "type"],
    },
  },
  {
    name: "klikr_advance_slide",
    description: "Advance the presentation to the next slide (or the previous one). If the presentation is in the lobby, this starts it on the first slide. Direction defaults to 'next'.",
    inputSchema: {
      type: "object",
      properties: {
        presentation_id: { type: "string" },
        direction: { type: "string", enum: ["next", "prev"] },
      },
      required: ["presentation_id"],
    },
  },
  {
    name: "klikr_end_presentation",
    description: "Close the presentation. Triggers final quiz scoring.",
    inputSchema: {
      type: "object",
      properties: { presentation_id: { type: "string" } },
      required: ["presentation_id"],
    },
  },
  {
    name: "klikr_get_responses",
    description: "Fetch all responses for a slide. For Q&A slides, includes upvote count per response.",
    inputSchema: {
      type: "object",
      properties: { slide_id: { type: "string" } },
      required: ["slide_id"],
    },
  },
  {
    name: "klikr_get_leaderboard",
    description: "Fetch the participant leaderboard for a presentation, sorted by score descending.",
    inputSchema: {
      type: "object",
      properties: { presentation_id: { type: "string" } },
      required: ["presentation_id"],
    },
  },
  {
    name: "klikr_list_presentations",
    description: "List the authenticated user's presentations.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

const DEFAULT_CONFIG: Record<SlideType, SlideConfig> = {
  mcq: { options: ["Option A", "Option B"] },
  wordcloud: { max_words_per_participant: 3 },
  open: {},
  quiz: { options: ["Right", "Wrong"], correct_index: 0, time_limit_s: 20 },
  qa: { upvotes: true, moderation: "off" },
  rating: { scale: 5, min_label: "Poor", max_label: "Great" },
  embed: { url: "", provider: "google-slides" },
  ranking: { items: ["Item A", "Item B", "Item C"] },
};

type RpcRequest = { jsonrpc: "2.0"; id?: number | string | null; method: string; params?: unknown };

function rpcResult(id: RpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}
function rpcError(id: RpcRequest["id"], code: number, message: string, data?: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } });
}
function textContent(text: string) {
  return { content: [{ type: "text", text }] };
}

function clientFromAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {},
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}

export async function POST(req: NextRequest) {
  let body: RpcRequest;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(body?.id, -32600, "Invalid Request");
  }

  const { id, method, params } = body;

  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === "tools/list") {
    return rpcResult(id, { tools: TOOLS });
  }
  if (method === "ping") {
    return rpcResult(id, {});
  }

  if (method !== "tools/call") {
    return rpcError(id, -32601, `Method not found: ${method}`);
  }

  const { name, arguments: args } = (params ?? {}) as { name: string; arguments: Record<string, unknown> };

  // Two auth paths: a `klikr_pk_*` API key (minted at /dashboard/api-keys),
  // or a Supabase access token (still supported for the in-app inspector).
  // API key wins when present; we resolve to a userId and use the service-role
  // client for queries (ownership is enforced explicitly per tool below).
  const authHeader = req.headers.get("authorization") ?? "";
  const isApiKey = /^Bearer\s+klikr_pk_/i.test(authHeader);

  let supabase;
  let userId: string | null = null;
  if (isApiKey) {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return rpcError(id, -32001, auth.message);
    userId = auth.userId;
    supabase = createServiceClient();
  } else {
    supabase = clientFromAuth(req);
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id ?? null;
  }

  const requireAuth = () => {
    if (!userId) {
      throw new Error("Authentication required: send Authorization: Bearer klikr_pk_<token> or a Supabase access token.");
    }
    return { id: userId };
  };
  const requirePresentationAccess = async (presentationId: string) => {
    const u = requireAuth();
    const { data: pres, error } = await supabase
      .from("presentations")
      .select("owner_id")
      .eq("id", presentationId)
      .maybeSingle();
    if (error) throw error;
    if (!pres) throw new Error("Presentation not found");
    if (pres.owner_id === u.id) return;
    const { data: editor } = await supabase
      .from("presentation_editors")
      .select("user_id")
      .eq("presentation_id", presentationId)
      .eq("user_id", u.id)
      .maybeSingle();
    if (!editor) throw new Error("Forbidden");
  };
  const requireSlideAccess = async (slideId: string) => {
    const { data: slide, error } = await supabase
      .from("slides")
      .select("presentation_id")
      .eq("id", slideId)
      .maybeSingle();
    if (error) throw error;
    if (!slide) throw new Error("Slide not found");
    await requirePresentationAccess(slide.presentation_id);
  };

  try {
    switch (name) {
      case "klikr_list_presentations": {
        const u = requireAuth();
        const { data, error } = await supabase
          .from("presentations")
          .select("id, title, code, state, created_at")
          .eq("owner_id", u.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return rpcResult(id, textContent(JSON.stringify(data ?? [], null, 2)));
      }

      case "klikr_create_presentation": {
        const u = requireAuth();
        const title = String(args?.title ?? "Untitled").slice(0, 200);
        for (let i = 0; i < 5; i++) {
          const code = generateRoomCode();
          const { data, error } = await supabase
            .from("presentations")
            .insert({ owner_id: u.id, title, code })
            .select("id, code")
            .single();
          if (!error && data) {
            const origin = req.nextUrl.origin;
            return rpcResult(id, textContent(JSON.stringify({
              id: data.id,
              code: data.code,
              title,
              edit_url: `${origin}/edit/${data.id}`,
              present_url: `${origin}/present/${data.id}`,
              join_url: `${origin}/play/${data.code}`,
            }, null, 2)));
          }
          if (error && error.code !== "23505") throw error;
        }
        throw new Error("Could not generate unique room code");
      }

      case "klikr_add_slide": {
        requireAuth();
        const presentationId = String(args.presentation_id);
        await requirePresentationAccess(presentationId);
        const type = String(args.type) as SlideType;
        const question = String(args.question ?? "");
        const config = (args.config as SlideConfig | undefined) ?? DEFAULT_CONFIG[type];

        const { data: existing } = await supabase
          .from("slides")
          .select("position")
          .eq("presentation_id", presentationId)
          .order("position", { ascending: false })
          .limit(1);
        const nextPos = (existing?.[0]?.position ?? -1) + 1;

        const { data, error } = await supabase
          .from("slides")
          .insert({ presentation_id: presentationId, position: nextPos, type, question, config })
          .select("id, position, type")
          .single();
        if (error) throw error;
        return rpcResult(id, textContent(JSON.stringify(data, null, 2)));
      }

      case "klikr_advance_slide": {
        requireAuth();
        const presentationId = String(args.presentation_id);
        await requirePresentationAccess(presentationId);
        const direction = String(args.direction ?? "next") as "next" | "prev";

        const { data: slides } = await supabase
          .from("slides")
          .select("id, position")
          .eq("presentation_id", presentationId)
          .order("position", { ascending: true });
        if (!slides || slides.length === 0) {
          throw new Error("Presentation has no slides");
        }
        const { data: pres } = await supabase
          .from("presentations")
          .select("state, current_slide_id")
          .eq("id", presentationId)
          .single();
        if (!pres) throw new Error("Presentation not found");

        let nextId: string | null = null;
        if (pres.state === "lobby") {
          nextId = slides[0].id;
        } else {
          const idx = slides.findIndex((s) => s.id === pres.current_slide_id);
          const nextIdx = direction === "next" ? idx + 1 : idx - 1;
          if (nextIdx < 0 || nextIdx >= slides.length) {
            throw new Error(`No ${direction} slide available`);
          }
          nextId = slides[nextIdx].id;
        }
        const { error } = await supabase
          .from("presentations")
          .update({
            state: "active",
            current_slide_id: nextId,
            current_slide_started_at: new Date().toISOString(),
          })
          .eq("id", presentationId);
        if (error) throw error;
        return rpcResult(id, textContent(JSON.stringify({ current_slide_id: nextId }, null, 2)));
      }

      case "klikr_end_presentation": {
        requireAuth();
        const presentationId = String(args.presentation_id);
        await requirePresentationAccess(presentationId);
        const { error } = await supabase
          .from("presentations")
          .update({ state: "closed" })
          .eq("id", presentationId);
        if (error) throw error;
        return rpcResult(id, textContent(JSON.stringify({ state: "closed" })));
      }

      case "klikr_get_responses": {
        const slideId = String(args.slide_id);
        await requireSlideAccess(slideId);
        const { data: responses, error } = await supabase
          .from("responses")
          .select("id, value_text, value_index, response_ms, created_at, participant_id")
          .eq("slide_id", slideId)
          .order("created_at", { ascending: true });
        if (error) throw error;

        // upvote counts (Q&A)
        const ids = (responses ?? []).map((r) => r.id);
        const { data: votes } = ids.length
          ? await supabase.from("question_votes").select("response_id").in("response_id", ids)
          : { data: [] as { response_id: string }[] };
        const counts = new Map<string, number>();
        for (const v of votes ?? []) counts.set(v.response_id, (counts.get(v.response_id) ?? 0) + 1);

        const out = (responses ?? []).map((r) => ({ ...r, upvotes: counts.get(r.id) ?? 0 }));
        return rpcResult(id, textContent(JSON.stringify(out, null, 2)));
      }

      case "klikr_get_leaderboard": {
        const presentationId = String(args.presentation_id);
        await requirePresentationAccess(presentationId);
        const { data, error } = await supabase
          .from("participants")
          .select("nickname, score, created_at")
          .eq("presentation_id", presentationId)
          .order("score", { ascending: false });
        if (error) throw error;
        return rpcResult(id, textContent(JSON.stringify(data ?? [], null, 2)));
      }

      default:
        return rpcError(id, -32601, `Unknown tool: ${name}`);
    }
  } catch (e) {
    return rpcError(id, -32000, (e as Error).message ?? "Tool execution failed");
  }
}

export async function GET() {
  return Response.json({
    ...SERVER_INFO,
    description: "Klikr MCP server. POST JSON-RPC 2.0 to this URL with a Supabase Bearer token.",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}
