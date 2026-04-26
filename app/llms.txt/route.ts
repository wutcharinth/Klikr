// llms.txt — emerging convention for AI agents and LLM crawlers, similar in
// spirit to robots.txt but pointing to the high-signal documentation an agent
// should read first. Served as text/plain at /llms.txt.

const BODY = `# Klikr

> Klikr is a real-time audience interaction platform — polls, word clouds, quizzes, Q&A, ratings, rankings — that runs on any phone with no app install. Hosts create slides, audience joins via a 6-letter code, and answers update live.

## What it does

- Live audience polls (multiple choice, single or multi-select)
- Word clouds, open responses, NPS ratings, rankings, multi-step quizzes (Kahoot-style)
- Q&A with optional moderation and upvoting
- Real-time leaderboards
- AI generation of slides from a prompt (currently disabled)
- CSV export of all responses

## API

- OpenAPI 3.1 spec: https://klikrapp.com/api/openapi.json
- Auth: \`Authorization: Bearer klikr_pk_<token>\`. Mint at https://klikrapp.com/dashboard/api-keys.
- Base path: \`/api/v1\`

### MCP server (Model Context Protocol)

- Endpoint: https://klikrapp.com/api/mcp
- Transport: HTTP + JSON-RPC 2.0 (single endpoint, no separate SSE channel)
- Tools: list_presentations, create_presentation, get_presentation, update_presentation, delete_presentation, list_slides, add_slide, update_slide, delete_slide, get_responses, control_session
- Auth: same \`Authorization: Bearer klikr_pk_...\` header

Connect from Claude Desktop / Cursor / ChatGPT by adding the URL above as a remote MCP server with that header.

## Important pages

- Marketing: https://klikrapp.com/
- Features: https://klikrapp.com/features
- Templates: https://klikrapp.com/templates
- Pricing: https://klikrapp.com/plans
- For hosts: https://klikrapp.com/host
- Live demo: https://klikrapp.com/demo
- About: https://klikrapp.com/about

## Data model

- Presentation: id, title, code (6 chars), state (lobby | active | closed), current_slide_id, owner_id
- Slide: id, presentation_id, position, type (mcq | wordcloud | open | quiz | qa | rating | embed | ranking), question, config (type-specific JSON), image_url, kahoot_mode
- Response: id, slide_id, value_index, value_text, status, flagged, created_at

## Useful for agents

- An agent can mint an API key, create a presentation, add slides, then call POST /api/v1/presentations/{id}/session with action=start to take it live.
- The 6-letter code returned in \`code\` is what the audience types at https://klikrapp.com/ to join.
- All ownership checks happen server-side; an API key can only access its owner's data.
`;

export async function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
