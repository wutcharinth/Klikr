# Playwright QA suite

End-to-end + DB-level regression tests for the live audience flow.

## Run

The Postgres URL must be in scope and the dev server must have a
`SUPABASE_SERVICE_ROLE_KEY` (server actions need it for `joinSession` /
`submitResponse`). Easiest invocation:

```bash
# 1) Start the dev server with the service-role key in env (one-off):
SUPABASE_SERVICE_ROLE_KEY="$(railway service klikr-web > /dev/null && \
  railway variables --kv | awk -F= '/^SUPABASE_SERVICE_ROLE_KEY=/{$1=""; sub(/^=/,""); print}')" \
  npm run dev

# 2) From another shell, run the suite against the Railway Postgres:
railway run --service Postgres bash -c '\
  POSTGRES_URL="$POSTGRES_URL" \
  PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npx playwright test'
```

Without `PLAYWRIGHT_BASE_URL`, the config will boot its own `npm run dev`
— but it inherits the parent shell's env, so the service-role key still
needs to be exported up front.

## What's covered

- `landing.spec.ts` — homepage smoke. Headline visible (regression for
  the background-clip:text bug that collapsed it to 0px width), join
  form present, hero placeholder rendered server-side, no horizontal
  overflow on iPhone.
- `audience-flow.spec.ts` — full audience journey: visit `/play/<code>`,
  pick a nickname, host moves to a Kahoot quiz slide, audience taps the
  right tile, host scores the slide, participant's score reflects the
  RPC's output.
- `scoring.spec.ts` — DB-level QA of the `score_quiz_slide` RPC. Pins
  the new formula (base 500 + speed bonus, NULL response_ms = fast,
  wrong answer = 0, idempotent across re-scoring).

## Helpers

`_helpers.ts` talks directly to Postgres via the `pg` client:

- `seedQuizSession({ code })` — creates an auth user + presentation +
  two quiz slides. Returns ids.
- `startSlide(presentationId, slideId)` — flips presentation state
  to `active` and points it at the slide.
- `scoreSlideAsOwner(slideId, ownerId)` — calls `score_quiz_slide` with
  the JWT claim faked to the owner so the RPC's `auth.uid()` check
  passes.
- `teardown(presentationId, ownerEmail)` — drops the presentation and
  the auth user.

Codes and emails are randomized per run so parallel desktop+mobile
projects don't race on the same row.
