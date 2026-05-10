# Audience Engagement Takeover — Design Spec

**Date:** 2026-05-10
**Status:** Approved (pending user review of this spec)
**Owner:** Audience UX

## Problem

The Klikr audience phone view is engagement-light outside Kahoot mode. Quiz / Kahoot slides have a satisfying reveal flow (medal, score, rank, +N pts float, podium). Every other slide type — `mcq`, `wordcloud`, `open`, `qa`, `rating`, `ranking` — collects a tap and goes quiet. There is no rank surfaced anywhere on the phone outside the quiz reveal, so audiences lose the leaderboard thread between quiz slides, and non-quiz slides feel inert.

The brief: every slide type should feel as alive as Kahoot during gameplay, with the player's rank visible to them, and lots of celebratory pop on submit.

## Goals

1. Show every audience member their leaderboard position when it changes — not buried.
2. Give every slide type a satisfying "submitted" moment, with rank/order signals built in.
3. Keep the existing quiz scoring lifecycle untouched (it just had a security fix in PR #1).
4. Stay incremental — don't rebuild the per-slide-type renderers.

## Non-goals

- Per-host calm/hype theme toggle (deferred).
- Universal scoring for non-quiz slide types (deferred — quiz-only scoring stands).
- Sound clips beyond the three minimal defaults.
- Reaction overlay redesign.
- Animated rank-history graph at session end.
- Engagement layer for `embed` slides (read-only).

## Decisions log

| ID | Question | Decision | Why |
|-|-|-|-|
| Q1 | What does "rank" mean for non-quiz slides? | **D** — quiz scoring stays the only rank source; non-quiz slides get a transient "Nth in" submission-order signal | Smallest data-model change; no new scoring system |
| Q2 | Animation intensity ceiling | **B — Kahoot-grade** | Brief is gameplay engagement; brand drift is contained to audience side |
| Q3 | Rank pill / submit feedback layout | **C — full-screen takeover on submit** | Loudest, clearest moment of celebration; rank stays out of the way during the question |
| Q4 | Implementation strategy | **1 — shared TakeoverLayer portal** | Smallest blast radius; takeover is a layer over slide-type UI, not a replacement |

## Architecture

### New module

`components/audience/TakeoverLayer.tsx` — single client component, mounted once at the root of `AudienceView`, just below `ReactionOverlay`. Renders at most one takeover at a time as a `position: fixed` full-bleed overlay (or a small bottom toast for the multi-submit variant).

### Imperative API

```ts
type TakeoverPayload =
  | { kind: "quiz-correct"; points: number; rankNow: number; rankBefore: number; total: number }
  | { kind: "quiz-wrong";   correctIndex: number; rankNow: number; total: number }
  | { kind: "quiz-skipped"; rankNow: number; total: number }
  | { kind: "submitted";    ordinal: number; total: number }
  | { kind: "toast";        text: string };

const { trigger } = useTakeover();
trigger({ kind: "submitted", ordinal: 3, total: 24 });
```

A `TakeoverContext` provider exposes `trigger(...)`. Internal state holds the active payload, an auto-dismiss timer (1.8s for full takeovers, 1.0s for toasts), and tap-to-skip / `Esc` handlers.

A new submission replaces an in-flight toast — never queues. A `current_slide_id` change cancels any active takeover and fires the appropriate quiz reveal variant.

### Per-slide variant map

| Slide type | On submit (audience action) | On host advance (slide reveal) |
|-|-|-|
| `quiz` (incl. Kahoot) | `toast` "Locked in" | `quiz-correct` / `quiz-wrong` / `quiz-skipped` |
| `mcq` (single & multi) | `submitted` | none |
| `rating` | `submitted` | none |
| `ranking` | `submitted` | none |
| `open` | `submitted` | none |
| `wordcloud` | `toast` "Word in" | none |
| `qa` | `toast` "Question in" | none |
| `embed` | n/a | n/a |

### What gets removed

- `RevealMedal` and `ScoreCard` exports from `components/QuizFeedback.tsx` — the rendering moves into `TakeoverLayer`.
- `encouragementFor` stays in `QuizFeedback.tsx` (or moves to `lib/quiz/encouragement.ts`) because `AudienceFinalResults.tsx` still consumes it. Either is fine; the spec leaves the placement as an implementation choice.
- The duplicated reveal blocks in `components/AudienceView.tsx` (~lines 530–580 in current file) — all routed through `trigger(...)`.
- The `PostQuizFeedback` block in `components/KahootAudienceView.tsx` — same routing.

CI grep guard: imports of `RevealMedal` / `ScoreCard` should be zero after the change.

## Data flow

| Moment | Source | Action |
|-|-|-|
| Audience submits any slide | `submitResponse(...)` return value | client calls `trigger({ kind: "submitted", ordinal, total })` for non-quiz; `trigger({ kind: "toast", text: "Locked in" })` for quiz |
| Host advances a quiz slide | realtime `presentations.UPDATE` on `current_slide_id` | client recomputes its own correctness + rank from the participants snapshot it already keeps; calls `trigger({ kind: "quiz-correct" \| "quiz-wrong" \| "quiz-skipped", ... })` |
| Session ends | realtime `presentations.state = closed` | existing `AudienceFinalResults` is restyled as a full takeover variant `final-podium` (out of scope for v1; current component renders inline below the takeover layer) |

### Server change (single file)

`app/play/[code]/actions.ts` — `submitResponse` returns submission stats for non-quiz slides:

```ts
if (slide.type !== "quiz") {
  const { count } = await supabase
    .from("responses")
    .select("*", { count: "exact", head: true })
    .eq("slide_id", input.slideId);
  return { ordinal: count ?? 1, total: count ?? 1 };
}
return {};
```

Cost: one `COUNT(*)` per submit. `responses(slide_id)` is already indexed (`0001_init.sql`). No schema migration needed. Quiz-path return shape stays empty so callers can branch trivially.

`submitQuestion` and `toggleQuestionVote` keep their existing return shapes; the multi-submit toast text is hard-coded client-side.

### Quiz rank computation

Audience does *not* hold a local snapshot of all participants — its realtime channels are scoped to the `presentations` row and its own `participants` row only. Rank is fetched on demand via the existing `getParticipantScores` server action, which returns the full participants list ordered by `score DESC, created_at ASC`.

Lifecycle inside the takeover layer:
- Before the host advances a quiz slide (i.e. while the audience submits), the layer caches the most-recent `getParticipantScores` result as `prevSnapshot`. (First quiz of the session: `prevSnapshot` is empty → `rankBefore = total`.)
- On the slide-advance realtime event, the layer calls `getParticipantScores` again, derives `rankNow` from the new list, and reads `rankBefore` from `prevSnapshot`. The two values feed the `rank-flip` animation and the rank-delta pill.
- The fresh list becomes the new `prevSnapshot` for the next round.

This is the same pattern the existing `ScoreCard` uses today — we are lifting it from inside `QuizFeedback.tsx` into the takeover layer, not inventing a new data path.

## Animation library — additions to `app/globals.css`

| Class | Use | Notes |
|-|-|-|
| `.takeover-bg-correct` | full-bleed gradient #22c55e → #14b8a6, animated 4s loop via `transform: translate3d` on a pseudo | green/cyan |
| `.takeover-bg-wrong` | gradient #ef4444 → #7c3aed, 4s loop | red/purple |
| `.takeover-bg-submit` | gradient #0071e3 → #ff3366, 4s loop | brand blue → pink |
| `.takeover-bg-skipped` | gradient #64748b → #334155, 4s loop | muted gray |
| `.big-num-pop` | overshoot spring `cubic-bezier(0.34, 1.86, 0.5, 1)`, scale 0.4 → 1, 0.7s | `+150`, `#2 ↑` |
| `.rank-flip` | two stacked digits — old slides up + fades, new comes in from below | rank changes |
| `.toast-slide-up` | translateY(40px) → 0 + opacity, 0.4s in / 0.4s out after 1s | bottom toast |
| `.shake-burst` | longer / stronger version of existing `.shake-once` | quiz-wrong |

Reused primitives: `.anim-pop`, `.points-float`, `.rank-delta-pill`, `.count-bump`, `MiniConfettiBurst`. Confetti fires only on `quiz-correct`.

All keyframes inside `@media (prefers-reduced-motion: reduce)` get a fade-only fallback; gradients freeze; confetti suppressed.

## Sound

Three short `<audio>` clips in `public/audio/`: `correct.mp3`, `wrong.mp3`, `submit.mp3`. Sound is **off by default**.

A small speaker toggle on the existing nickname / lobby screen writes `klikr:audio:on` to `localStorage`. The takeover layer reads this flag before playing. The existing podium chime keeps the same toggle.

Vibration (`navigator.vibrate(50)`) currently called inside `KahootAudienceView` is moved into the takeover trigger and gated behind the same flag.

## Accessibility

- Full-screen takeover renders with `role="status" aria-live="polite"`.
- Never steals focus from the page.
- Tap anywhere or press `Esc` dismisses early.
- Reduced motion → flat fade, no springs, no confetti.
- Color-blind safe — every variant pairs a color cue with an icon and text label (✓ / ✗ / ⏱ / 🎯).

## Testing

| Test | File | Verifies |
|-|-|-|
| Takeover renders on submit for each non-quiz slide type | new `e2e/audience-takeover.spec.ts` | `submitted` variant with correct ordinal/total |
| Quiz takeover lifecycle | extend `e2e/scoring.spec.ts` | "Locked in" toast on submit, `quiz-correct` after host advances, no double-fire |
| Multi-submit toast | extend `e2e/slide-types.spec.ts` | wordcloud / qa show toast, second submit allowed during in-flight toast |
| Reduced-motion fallback | new spec, mocked `matchMedia` | confetti suppressed, gradients static |
| Mute toggle | new spec | audio elements not played when flag off |
| Dead-code guard | CI grep | no remaining imports of `RevealMedal` / `ScoreCard` |

Existing SQL-driven scoring tests are untouched (they bypass the client).

## Risks and mitigations

| Risk | Mitigation |
|-|-|
| Host advances during in-flight takeover (rapid Kahoot rounds) | `current_slide_id` realtime change cancels any active takeover and fires the reveal variant |
| 60 fps on low-end Android with animated gradient | Animate `transform: translate3d` on a gradient pseudo, never `background-position`; cap to 4s loop; auto-disable on reduced motion |
| `COUNT(*)` on `responses` at 1000+ concurrent submits | Indexed, single-row return; if it ever shows up in pg_stat, swap for `estimated_count` head |
| Full-screen overlay = a11y trap | `aria-live`, no focus steal, tap / `Esc` dismiss |
| Brand drift from "Apple-inspired" baseline | Audience-only; documented as an explicit decision in this spec |
| Two takeovers fire back-to-back (e.g. submit toast → reveal) | Reveal variants take priority; toast is cancelled and replaced |

## Files touched (estimated)

| File | Change |
|-|-|
| `components/audience/TakeoverLayer.tsx` | NEW — context provider + overlay component |
| `components/audience/useTakeover.ts` | NEW — hook |
| `components/AudienceView.tsx` | wrap root in provider; replace inline reveal with `trigger(...)`; drop ~50 LOC of duplicated medal/score JSX |
| `components/KahootAudienceView.tsx` | drop post-question reveal block; route through `trigger(...)`; remove inline `vibrate` |
| `components/QuizFeedback.tsx` | shrunk — `RevealMedal` / `ScoreCard` removed; `encouragementFor` retained (or moved to `lib/quiz/encouragement.ts`) for `AudienceFinalResults` |
| `app/play/[code]/actions.ts` | `submitResponse` returns `{ ordinal, total }` for non-quiz |
| `app/globals.css` | add 8 new keyframe classes; reduced-motion fallbacks |
| `public/audio/correct.mp3`, `wrong.mp3`, `submit.mp3` | NEW (small sourced clips) |
| `e2e/audience-takeover.spec.ts` | NEW |
| `e2e/scoring.spec.ts`, `e2e/slide-types.spec.ts` | extended |

Net: ~1 new feature module, ~1 deleted file, ~3 modified components, 1 server-action change, ~8 CSS additions, 1 new e2e spec.

## Acceptance criteria

- Submitting on `mcq`, `rating`, `ranking`, `open` triggers a full-screen takeover showing the participant their submission ordinal and total responses so far, auto-dismissing in 1.8 s.
- Submitting on `wordcloud` or `qa` triggers a 1 s bottom toast that does not block a second submit.
- Submitting on `quiz` (incl. Kahoot) triggers only a "Locked in" toast; the full reveal fires when the host advances.
- The full reveal shows the participant's new rank, points, and rank-change delta, with confetti on correct.
- Audience client receiving a `current_slide_id` change while a takeover is on screen cancels it and fires the appropriate reveal variant within 100 ms.
- Reduced-motion preference suppresses confetti and gradient animation; takeovers still fire as a flat fade.
- Sound off by default; toggle in lobby controls every audio cue.
- All existing e2e specs pass; new takeover spec passes for every non-embed slide type.
