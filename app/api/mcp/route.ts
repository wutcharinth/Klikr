import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { callTool, isToolName, SERVER_INSTRUCTIONS, ToolError, TOOLS } from "@/lib/mcp/tools";
import { SlideInputError } from "@/lib/mcp/slideInput";

/**
 * Klikr Model Context Protocol server — Streamable HTTP transport, stateless.
 *
 * POST /api/mcp takes JSON-RPC 2.0 (a single message or a batch) and answers
 * with plain JSON. There is no server-initiated stream, so GET with
 * `Accept: text/event-stream` gets 405, as the spec allows.
 *
 * Auth: `Authorization: Bearer klikr_pk_<key>` (minted at /dashboard/api-keys),
 * or a Supabase access token. `initialize` and `tools/list` work without auth
 * so clients can discover the tools; `tools/call` needs it.
 */

const SERVER_INFO = { name: "klikr", title: "Klikr", version: "0.2.0" };
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type RpcId = number | string | null;
type RpcMessage = { jsonrpc?: string; id?: RpcId; method?: unknown; params?: unknown };
type RpcResponse =
  | { jsonrpc: "2.0"; id: RpcId; result: unknown }
  | { jsonrpc: "2.0"; id: RpcId; error: { code: number; message: string; data?: unknown } };

const ok = (id: RpcId, result: unknown): RpcResponse => ({ jsonrpc: "2.0", id, result });
const err = (id: RpcId, code: number, message: string): RpcResponse => ({ jsonrpc: "2.0", id, error: { code, message } });
const toolText = (text: string, isError = false) => ({ content: [{ type: "text", text }], ...(isError ? { isError: true } : {}) });

type Auth = { db: SupabaseClient; userId: string } | { error: string };

async function resolveAuth(req: NextRequest): Promise<Auth> {
  const header = req.headers.get("authorization") ?? "";
  if (/^Bearer\s+klikr_pk_/i.test(header)) {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return { error: `${auth.message} Create a key at ${req.nextUrl.origin}/dashboard/api-keys.` };
    // Service role: tools enforce ownership themselves.
    return { db: createServiceClient(), userId: auth.userId };
  }
  const bearer = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (bearer) {
    const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    });
    const { data } = await db.auth.getUser(bearer);
    if (data.user) return { db, userId: data.user.id };
  }
  return {
    error: `Authentication required: connect with the header "Authorization: Bearer klikr_pk_…". Create a key at ${req.nextUrl.origin}/dashboard/api-keys.`,
  };
}

async function handle(msg: RpcMessage, req: NextRequest, auth: () => Promise<Auth>): Promise<RpcResponse | null> {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg && typeof msg === "object" && "id" in msg ? (msg.id ?? null) : null, -32600, "Invalid Request");
  }
  // Notifications (no id) get no response — e.g. notifications/initialized.
  if (!("id" in msg) || msg.id === undefined) return null;
  const id = msg.id ?? null;
  const params = (msg.params && typeof msg.params === "object" ? msg.params : {}) as Record<string, unknown>;

  switch (msg.method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return ok(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "resources/list":
      return ok(id, { resources: [] });
    case "resources/templates/list":
      return ok(id, { resourceTemplates: [] });
    case "prompts/list":
      return ok(id, { prompts: [] });
    case "tools/call": {
      const name = params.name;
      if (typeof name !== "string" || !isToolName(name)) {
        return err(id, -32602, `Unknown tool: ${String(name)}`);
      }
      const a = await auth();
      if ("error" in a) return ok(id, toolText(a.error, true));
      try {
        const result = await callTool(name, params.arguments, { db: a.db, userId: a.userId, origin: req.nextUrl.origin });
        return ok(id, toolText(JSON.stringify(result, null, 2)));
      } catch (e) {
        // Input/permission problems go back as tool errors the model can read
        // and fix; anything else is logged and reported generically.
        if (e instanceof ToolError || e instanceof SlideInputError) return ok(id, toolText(e.message, true));
        console.error(`mcp ${name} failed`, e);
        return ok(id, toolText(`Klikr couldn't complete ${name}: ${(e as Error).message ?? "unexpected error"}`, true));
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(err(null, -32700, "Parse error"), { status: 400 });
  }

  // Resolve auth at most once per HTTP request, and only if a tool runs.
  let authPromise: Promise<Auth> | null = null;
  const auth = () => (authPromise ??= resolveAuth(req));

  if (Array.isArray(body)) {
    if (body.length === 0) return Response.json(err(null, -32600, "Invalid Request"), { status: 400 });
    const out = (await Promise.all(body.map((m) => handle(m as RpcMessage, req, auth)))).filter(Boolean);
    return out.length ? Response.json(out) : new Response(null, { status: 202 });
  }
  const res = await handle(body as RpcMessage, req, auth);
  return res ? Response.json(res) : new Response(null, { status: 202 });
}

export async function GET(req: NextRequest) {
  // No server-initiated SSE stream on this stateless endpoint.
  if ((req.headers.get("accept") ?? "").includes("text/event-stream")) {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  return Response.json({
    ...SERVER_INFO,
    description: "Klikr MCP server (Streamable HTTP). POST JSON-RPC 2.0 here with Authorization: Bearer klikr_pk_<key>.",
    docs: `${req.nextUrl.origin}/docs/api`,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}

export async function DELETE() {
  // Stateless: there's no session to terminate.
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
