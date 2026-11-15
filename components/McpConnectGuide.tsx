// How to connect an AI assistant to Klikr's MCP server. Server component —
// shown on /docs/api and /dashboard/api-keys (where people get their key).

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klikrapp.com";

const preStyle = { background: "var(--bg-soft)", border: "1px solid var(--line)" } as const;

function Snippet({ title, note, code }: { title: string; note?: React.ReactNode; code: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {note && <p className="mt-0.5 text-xs muted-text">{note}</p>}
      <pre className="mono mt-2 overflow-x-auto rounded-xl p-4 text-xs leading-relaxed" style={preStyle}>
        {code}
      </pre>
    </div>
  );
}

export function McpConnectGuide({ apiKeyHint = "klikr_pk_…" }: { apiKeyHint?: string }) {
  const url = `${SITE}/api/mcp`;
  return (
    <div className="space-y-5">
      <Snippet
        title="Claude Code"
        code={`claude mcp add --transport http klikr ${url} \\\n  --header "Authorization: Bearer ${apiKeyHint}"`}
      />
      <Snippet
        title="Cursor, Windsurf, VS Code and other clients with remote MCP"
        note="Add to the client's MCP config (for Cursor: ~/.cursor/mcp.json)."
        code={`{
  "mcpServers": {
    "klikr": {
      "url": "${url}",
      "headers": { "Authorization": "Bearer ${apiKeyHint}" }
    }
  }
}`}
      />
      <Snippet
        title="Claude Desktop"
        note={
          <>
            Uses the <span className="mono">mcp-remote</span> bridge (needs Node.js). Add to{" "}
            <span className="mono">claude_desktop_config.json</span>, then restart Claude.
          </>
        }
        code={`{
  "mcpServers": {
    "klikr": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${url}", "--header", "Authorization:\${KLIKR_AUTH}"],
      "env": { "KLIKR_AUTH": "Bearer ${apiKeyHint}" }
    }
  }
}`}
      />
      <div>
        <p className="text-sm font-medium">Then just ask</p>
        <ul className="mt-2 space-y-1.5 text-sm muted-text">
          <li>“Make a 10-question game-mode quiz about the solar system, with an explanation for each answer.”</li>
          <li>“Build a post-workshop survey: a 1–5 rating, a word cloud and an open feedback question.”</li>
          <li>“In my Friday trivia deck, make question 4 harder and move it to the end.”</li>
          <li>“Duplicate last week's quiz for the new team and rename it.”</li>
        </ul>
      </div>
    </div>
  );
}

export const MCP_TOOL_SUMMARY: { group: string; tools: string[] }[] = [
  {
    group: "Build & maintain",
    tools: [
      "klikr_create_presentation",
      "klikr_get_presentation",
      "klikr_list_presentations",
      "klikr_add_slides",
      "klikr_update_slide",
      "klikr_delete_slide",
      "klikr_reorder_slides",
      "klikr_update_presentation",
      "klikr_duplicate_presentation",
    ],
  },
  { group: "Run & results", tools: ["klikr_advance_slide", "klikr_end_presentation", "klikr_get_responses", "klikr_get_leaderboard"] },
];
