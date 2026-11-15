import NavBar from "@/components/NavBar";
import { McpConnectGuide, MCP_TOOL_SUMMARY } from "@/components/McpConnectGuide";

export const metadata = {
  title: "API & MCP docs",
  description: "Interactive OpenAPI spec for Klikr's REST API and MCP server.",
};

export default function ApiDocsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar />

      <header className="mt-12">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">Developers</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          <span className="headline-shine">Klikr API</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] muted-text">
          Drive Klikr from any HTTP client or AI agent. Mint a key at{" "}
          <a href="/dashboard/api-keys" className="underline-offset-4 hover:underline" style={{ color: "var(--blue)" }}>
            /dashboard/api-keys
          </a>{" "}
          and call the endpoints below with{" "}
          <code className="mono">Authorization: Bearer klikr_pk_…</code>.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href="/api/openapi.json"
          className="tilt panel block p-5"
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] muted-text">REST</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">OpenAPI 3.1 spec</h2>
          <p className="mt-1 text-sm muted-text">
            Machine-readable spec for every <code className="mono">/api/v1</code> route. Drop into Postman, Stoplight, or your codegen.
          </p>
        </a>
        <a href="/llms.txt" className="tilt panel block p-5" target="_blank" rel="noopener noreferrer">
          <p className="text-[11px] uppercase tracking-[0.18em] muted-text">For AI agents</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">llms.txt</h2>
          <p className="mt-1 text-sm muted-text">
            Plain-language index of the surface, written for LLM crawlers and agent platforms.
          </p>
        </a>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">MCP server</h2>
        <p className="mt-2 max-w-2xl text-sm muted-text">
          Connect Klikr to Claude, Cursor or any client that speaks the Model Context Protocol, then build and edit
          quizzes, polls and surveys by just asking. A whole deck can be created in one call, and every slide is
          checked against the same rules as the editor, with errors that say exactly what to fix.
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem]">
          <McpConnectGuide />
          <aside className="space-y-5 text-sm">
            {MCP_TOOL_SUMMARY.map((g) => (
              <div key={g.group}>
                <p className="text-[11px] uppercase tracking-[0.18em] muted-text">{g.group}</p>
                <ul className="mt-2 space-y-1">
                  {g.tools.map((t) => (
                    <li key={t} className="mono text-xs">{t}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs muted-text">
              Endpoint <span className="mono">/api/mcp</span> · Streamable HTTP · protocol 2024-11-05 to 2025-06-18.
            </p>
          </aside>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">Quickstart</h2>
        <pre className="mono mt-4 overflow-x-auto rounded-xl p-4 text-xs"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid var(--line)" }}>
{`# 1) Create a presentation
curl -X POST https://klikrapp.com/api/v1/presentations \\
  -H "Authorization: Bearer $KLIKR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Q4 retro"}'

# 2) Add a poll slide
curl -X POST https://klikrapp.com/api/v1/presentations/<id>/slides \\
  -H "Authorization: Bearer $KLIKR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"mcq","question":"How was Q4?","config":{"options":["Great","OK","Rough"]}}'

# 3) Take it live
curl -X POST https://klikrapp.com/api/v1/presentations/<id>/session \\
  -H "Authorization: Bearer $KLIKR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"start"}'`}
        </pre>
      </section>
    </main>
  );
}
