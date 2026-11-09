# Klikr

Realtime audience-interaction platform — polls, quizzes, Q&A, word clouds, ratings, ranking, and Kahoot-style trivia. Hosts run a live deck on a big screen, the audience joins from any phone via a 6-character code or QR scan, and answers stream back live over Supabase Realtime.

> Status: private repo · Next.js 16 · Supabase · TypeScript.

---

## Quickstart

Requirements:

- Node.js **≥ 20.9.0** (matches `engines.node`)
- A Supabase project (Postgres + Auth + Realtime)
- A Google OAuth client (used for host sign-in)
- Optional: Unsplash API key for slide images, Gemini key if you turn AI on

```bash
git clone git@github.com:wutcharinth/Klikr.git
cd Klikr
npm install
cp .env.example .env.local   # if present, else create one — see "Environment" below
DATABASE_URL=postgresql://… npm run migrate
npm run dev
```

Then open:

- `http://localhost:3000` — landing page
- `http://localhost:3000/dashboard` — host dashboard (redirects to Google sign-in)
- `http://localhost:3000/play/<CODE>` — audience join page

---

## What it does

| Slide type    | Audience input                            | Presenter view                                                             |
|---------------|-------------------------------------------|----------------------------------------------------------------------------|
| `mcq`         | Single or multi-select buttons            | Animated bar chart of vote counts                                          |
| `wordcloud`   | Up to N words per participant             | Live tag cloud, sized by frequency                                         |
| `open`        | Free-form text                            | Streamed responses                                                         |
| `quiz`        | Timed multiple-choice with `correct_index`| Countdown + reveal bar chart + optional explanation                        |
| `quiz` (Kahoot mode) | Tile picker (▲ ◆ ● ■), speed-scored | Big colored tiles, vote-share fill, "X / Y got it right" + final podium    |
| `qa`          | Submit + upvote questions                 | Moderation tray (pre/post), pinned questions, sorted by votes              |
| `rating`      | 1–5 or 0–10 scale                         | Distribution chart with min/max labels                                     |
| `ranking`     | Drag/arrow re-order a list                | Aggregated ranking display                                                 |
| `embed`       | (read-only)                               | Iframed external content                                                   |

**Game-show mode** (`slides.kahoot_mode`) layers on:

- A 3-second "get ready" intro per question (question alone on screen, answers unlock after; timing and speed scoring start from the unlock, enforced server-side)
- Speed-based scoring (sooner = more points, server-side via the `score_quiz_slide` RPC)
- Shape tiles in Klikr's palette (`lib/quizTiles.ts`), CSS-driven timer ring + urgency bar, live "answers in" counter
- Reveal: correct tile pops with confetti, the rest dim, vote fills grow and counts tick up
- Two-beat leaderboard: rows start at last round's standings, then spring to the new ones while scores count up; streak + biggest-climber callouts
- Per-question reveal on the audience phone (points count-up, streak, rank chip, "N pts behind X") + synthesized sound/haptics
- End-of-session 3 → 2 → 1 podium reveal on both presenter and phone

Other built-ins:

- 22+ ready-to-play templates (icebreakers, retros, recognition, classroom, surveys, Kahoot trivia)
- Reactions overlay (emoji floats from the audience to the presenter screen)
- CSV / XLSX / PDF export per session
- Light/dark mode, EN/TH locales (`next-intl`)
- AI deck generator (Gemini, gated by `NEXT_PUBLIC_AI_ENABLED`)
- Public REST API + MCP server (`/api/v1/*`, `/api/mcp`)

---

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **Supabase** — Postgres, Auth (Google OAuth), Realtime (`postgres_changes` channels)
- **TypeScript**
- **Tailwind CSS** + custom design tokens in [app/globals.css](app/globals.css)
- **next-intl** for i18n
- **Recharts** for analytics charts
- **canvas-confetti** + bespoke CSS keyframes for motion
- **react-pdf** for PDF export
- **Playwright** for E2E (`e2e/`) and QA screenshots

---

## Project layout

```
app/                    Next.js routes
  (auth)/               Sign-in / OAuth callback
  about/                Marketing page
  admin/                Admin analytics (gated)
  api/                  REST endpoints
    v1/                 Public API (auth via API key)
    ai/                 AI deck generator (gated)
    export/[id]/        CSV/XLSX/PDF exporters
    mcp/                MCP server endpoint
    unsplash/           Image search proxy
  auth/callback/        OAuth code exchange
  dashboard/            Host dashboard (presentation list, pin, duplicate)
  edit/[id]/            Slide editor
  feedback/             In-app feedback intake
  host/                 Host shell wrapper
  play/[code]/          Audience join + actions
  present/[id]/         Live presenter view
  templates/            Public templates gallery
  globals.css           Design tokens, motion keyframes
  layout.tsx            Root layout (locale, theme)
  llms.txt              Discovery hints for LLM crawlers

components/             Client components
  AudienceView.tsx      Audience router (per slide type)
  AudienceFinalResults  End-of-session phone view (medal + mini podium)
  KahootAudienceView    Kahoot tile picker + post-question reveal
  KahootPresenterView   Big-screen Kahoot reveal
  PresenterView.tsx     Live presenter shell
  QuizFeedback.tsx      Shared RevealMedal / ScoreCard / encouragement
  QuizPodium.tsx        Final 3 → 2 → 1 reveal
  Leaderboard.tsx       Top-10 live leaderboard
  ResultsBarChart.tsx   Bar chart with reveal highlight
  ReactionOverlay.tsx   Floating emoji reactions
  SlideEditor.tsx       Per-slide config editor
  FeedbackWidget.tsx    Floating dismissible feedback bubble
  ...

lib/
  supabase/             Browser, server, service, middleware clients
  ai.ts                 Gemini wrappers
  apiAuth.ts            API-key auth for /api/v1/*
  code.ts               6-char join-code generator
  credits.ts            AI credits accounting
  embed.ts              Embed URL sanitisation
  featureFlags.ts       NEXT_PUBLIC_AI_ENABLED gate
  plans.ts              Pricing tiers
  profanity.ts          Nickname/word filter
  types.ts              SlideType + per-type config types

supabase/
  migrations/           Numbered SQL migrations (run via npm run migrate)

i18n/                   next-intl request handler
messages/               en.json, th.json
scripts/
  migrate.mjs           Idempotent SQL runner against DATABASE_URL
  qa-screenshots.mjs    Playwright captures for landing pages
  seed-and-shoot.mjs    Seed demo data + capture
public/                 Logos, music tracks, podium chime
```

---

## Environment

Create `.env.local` with at least:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # used by server actions only

# Database — used by `npm run migrate` only, not at runtime
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres

# Auth — Google OAuth must be configured in the Supabase dashboard with
# a redirectTo of <site>/auth/callback.

# Optional integrations
UNSPLASH_ACCESS_KEY=<unsplash-app-access-key>
GOOGLE_GENAI_API_KEY=<gemini-key>              # only when AI is enabled
NEXT_PUBLIC_AI_ENABLED=false                   # set to "true" to expose AI routes/UI

# Site (used by emails, sitemap, OAuth redirect builders)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never commit any of these. The repo's `.gitignore` already excludes `.env.local`.

---

## Database

Migrations live in [supabase/migrations](supabase/migrations) and are numbered (`0001_init.sql` … `0023_page_views.sql`). They are **append-only**: never edit a shipped migration; add a new one.

Run all pending migrations against your Supabase Postgres:

```bash
DATABASE_URL=postgresql://… npm run migrate
```

The runner ([scripts/migrate.mjs](scripts/migrate.mjs)) tracks applied files in a `_migrations` table and skips ones already there.

Core tables:

- `presentations` — host-owned deck (state: `lobby` / `active` / `closed`, `current_slide_id`, `current_slide_started_at`, theme)
- `slides` — `type`, `config` (JSONB, shape depends on type), `position`, `kahoot_mode`
- `participants` — audience joiner (per presentation, with `participant_token` for response auth and `score`)
- `responses` — one row per submitted answer (text or index, `response_ms` for quizzes, `status` for Q&A moderation)
- `quiz_slide_scores` — per-slide per-participant points (idempotent re-scoring)
- `question_votes` — Q&A upvotes
- `presentation_editors` — multi-host collaboration
- `profiles`, `api_keys`, `ai_credits`, `app_feedback`, `page_views`, `templates`

Important RPCs / views:

- `score_quiz_slide(p_slide_id)` — security-definer, called by `moveSlide`/`endPresentation`. Scales points by speed (`1 - response_ms/limit`).
- `move_slide(p_presentation_id, p_direction, p_intro_ms)` — one round trip: scores the quiz being left, moves, and sets the next quiz's answer window `p_intro_ms` in the future (the get-ready intro).
- `get_standing(p_participant_id, p_token, p_top)` — one player's score, rank, the player just ahead and the top-N board (the phone used to download the whole roster to work this out).
- `get_qa_votes(p_slide_id, p_participant_id)` — per-question upvote totals for a Q&A slide, aggregated in SQL.

Everything that calls the 0027 functions falls back to the previous query path if the migration hasn't been applied yet (`lib/supabase/rpc.ts`), so code can deploy before `npm run migrate`.
- `editable_presentations` — view exposing presentations the current `auth.uid()` owns or edits. The dashboard reads from this.

RLS is enabled on every table. The audience uses a server-side service-role client (in [app/play/[code]/actions.ts](app/play/[code]/actions.ts)) for inserts that need to skip RLS, but `select` policies for `participants` / `responses` are intentionally permissive so audience clients can compute their own rank.

---

## Realtime architecture

Both the host and the audience subscribe to Supabase Realtime channels and re-fetch on change. Channels in use:

| Channel                                   | Subscriber  | Watches                                                       |
|-------------------------------------------|-------------|---------------------------------------------------------------|
| `audience-${presentationId}`              | Audience    | `presentations` row updates (slide advance, state change, `scored_rev`) |
| `pres-${presentationId}`                  | Presenter   | `presentations` + `participants` filtered to this session (JWT pinned first — see `lib/realtime.ts`) |
| `slide-${currentSlideId}`                 | Presenter   | `responses` for the current slide                             |
| `qa-${slideId}` / `qa-votes-${slideId}`   | Both        | Q&A inserts/moderation updates; vote changes trigger a throttled `get_qa_votes` refresh |
| `reactions:${presentationId}`             | Both        | **Broadcast** (not postgres_changes): emoji reactions, no DB write per tap |

Server-side scoring fires inside `move_slide` / `endPresentation` and at timer expiry ([app/present/[id]/actions.ts](app/present/[id]/actions.ts)) — never on the client. Each phone keeps one shared standings store ([components/audience/StandingsContext.tsx](components/audience/StandingsContext.tsx)): one `get_standing` call per `scored_rev` change, shared by the score pill, the reveal, the leaderboard and the final screen.

Performance notes:

- Realtime-fed lists on the presenter apply in per-frame batches (`lib/useBufferedState.ts`): a burst of 200 answers/second costs ~60 renders, not 200.
- Quiz timing runs on the server clock (`lib/serverClock.ts` samples `/api/time`), so phones with skewed clocks still reveal on time. Phase changes are one-shot timers (`lib/useQuizPhase.ts`); progress bars and the timer ring are single CSS animations anchored with a negative `animation-delay` — no per-tick re-renders.
- Remotion only loads at session end (podium, via `next/dynamic`); the phone lobby uses a CSS logo animation.
- Phone sound effects are synthesized with WebAudio (`lib/audio.ts`) — zero downloads. Presenter music uses `preload="none"` and a single `<audio>` element for the whole session.

---

## Hosting & deploy

The repo ships with [`railway.toml`](railway.toml) for Railway (Nixpacks builder, `npm run start`, healthcheck on `/`). It runs equally well on Vercel — set the same env vars and you're done.

After every deploy:

1. Run `npm run migrate` against your prod database to pick up new migrations. (Code calling newer RPCs falls back gracefully until you do, but the fast paths need them.)
2. The Supabase Realtime publication must include the live tables. The init migration does this for `presentations`, `slides`, `participants`, `responses`, `question_votes`. New tables that need realtime must `alter publication supabase_realtime add table <name>;` in their migration.
3. The Google OAuth client's redirect URI must be `<site>/auth/callback`.

---

## Scripts

```bash
npm run dev        # next dev (turbopack)
npm run build      # next build (production)
npm run start      # next start
npm run lint       # eslint .
npm run migrate    # apply pending SQL migrations to DATABASE_URL
node scripts/qa-screenshots.mjs   # capture Playwright screenshots of marketing pages
node scripts/seed-and-shoot.mjs   # seed a demo presentation and screenshot it
```

---

## Public API

REST endpoints under `/api/v1/*` are auth-gated by API keys (created in `/dashboard/api-keys`):

- `POST   /api/v1/presentations` — create
- `GET    /api/v1/presentations/:id` — read
- `PATCH  /api/v1/presentations/:id` — update title / theme / state
- `POST   /api/v1/slides` — append slide
- `PATCH  /api/v1/slides/:id` — update slide
- `DELETE /api/v1/slides/:id` — delete slide

The OpenAPI spec is committed at [app/api/openapi.json](app/api/openapi.json).

There's also an MCP (Model Context Protocol) endpoint at `/api/mcp` for LLM tool use — same auth, exposes `list_presentations`, `add_slide`, `participants_summary`, etc.

---

## Internationalization

`next-intl` middleware. Strings live in [messages/en.json](messages/en.json) and [messages/th.json](messages/th.json). Switch in the UI via the locale toggle in `NavBar`. To add a locale, drop a new JSON next to the existing two and register it in `i18n/request.ts`.

---

## Motion design

All animations are CSS keyframes plus `canvas-confetti` for big bursts — no Framer Motion or GSAP. Number tweens use a tiny rAF hook (`lib/useCountUp.ts`). Motion is transform/opacity only (no animated `filter: blur()`). Motion utilities live in [app/globals.css](app/globals.css):

- Entrances: `.anim-fade-up`, `.anim-fade-in`, `.anim-pop`, `.slide-enter`, `.morph-in/out`
- Reveal accents: `.shake-once`, `.rippleOut`, `.count-bump`, `.burst-particle` (`ConfettiBurst` and `MiniConfettiBurst`)
- Score/rank micro-motion: `.points-float`, `.rank-delta-pill`
- Lobby/landing: `.start-pulse`, `.qr-halo`, `.pulse-ring`, `.float-slow`, `.headline-shine`, `.sheen`
- Join toast: `.join-toast`; lobby milestones: `.milestone-burst`, `.chip-bounce`
- Game show: `.gs-*` (intro, tiles, timer ring, reveal), `.quiz-tile*`, `.time-bar` / `.intro-bar` (CSS-driven timers), `.rank-chip`, `.streak-pill`, `.lb-row-*`

`/dev/quiz-preview` (dev builds only) renders every quiz phase with mock data, plus a render-count stress test.

Every keyframe respects `prefers-reduced-motion: reduce`.

---

## Conventions

- App Router only — server components by default, mark client with `"use client"` at the top of the file.
- Server-only secrets (service role key, AI key) must never be imported into a `"use client"` file.
- Migrations are append-only and numbered; never edit a merged migration.
- Visual style: Apple-inspired, see the design tokens at the top of [app/globals.css](app/globals.css). Stick to `--blue` for accent and `--ink` for primary text.
- No new heavy dependencies without a clear win.

---

## License

Private. All rights reserved.

---

A personal project by Wutcharin — [LinkedIn](https://www.linkedin.com/in/wutcharin/) · [wutcharin.com](https://wutcharin.com/).
