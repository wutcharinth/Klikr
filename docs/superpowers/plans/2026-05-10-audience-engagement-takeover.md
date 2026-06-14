# Audience Engagement Takeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kahoot-grade celebration and rank surfacing to the Klikr audience phone view across every slide type, via a shared full-screen `TakeoverLayer` overlay.

**Architecture:** One `TakeoverContext` provider mounted at the root of `AudienceView`; one imperative `trigger(payload)` hook used by every slide-type submit handler; one `TakeoverLayer` overlay component that renders the active payload as either a full-screen variant or a bottom toast, auto-dismissing on a timer. Existing reveal blocks in `AudienceView` and `KahootAudienceView` are routed through the same hook; `RevealMedal`/`ScoreCard` are deleted, `encouragementFor` stays.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict, Tailwind + raw CSS keyframes in `app/globals.css`, Supabase server actions, Playwright for e2e.

**Spec:** [docs/superpowers/specs/2026-05-10-audience-engagement-takeover-design.md](../specs/2026-05-10-audience-engagement-takeover-design.md)

**Working branch:** `fix/quiz-score-forgery` (carries the security fix from PR #1; this work stacks on top — keep the same branch or rebase onto a fresh one once PR #1 merges).

---

## File structure

| File | Status | Responsibility |
|-|-|-|
| `components/audience/TakeoverContext.tsx` | NEW | Context + provider + `useTakeover` hook |
| `components/audience/TakeoverLayer.tsx` | NEW | Overlay component that reads context state and renders variants |
| `components/audience/takeover-variants.tsx` | NEW | Pure presentational sub-components for each variant (`<QuizCorrectVariant/>`, `<SubmittedVariant/>`, `<ToastVariant/>`, etc.) |
| `lib/audio.ts` | NEW | `isAudioOn()`, `setAudioOn()`, `playClip(name)` — localStorage flag + safe `<Audio>` playback |
| `app/play/[code]/actions.ts` | MODIFIED | `submitResponse` returns `{ ordinal, total }` for non-quiz slides |
| `components/AudienceView.tsx` | MODIFIED | Wrap root in provider; replace reveal block in `Quiz`; call `trigger(...)` from each slide-type submit |
| `components/KahootAudienceView.tsx` | MODIFIED | Drop `PostQuizFeedback`; call `trigger(...)` on expiry |
| `components/QuizFeedback.tsx` | MODIFIED | Delete `RevealMedal` + `ScoreCard`; keep `encouragementFor` |
| `app/globals.css` | MODIFIED | Add 8 new keyframe classes + reduced-motion fallbacks |
| `e2e/audience-takeover.spec.ts` | NEW | Per-slide-type takeover coverage |

Audio assets are reused from `public/audio/`: `prize-button.mp3` for submit, `quiz-pulse.mp3` for correct, no clip for wrong (vibration only). No new binary files needed.

---

## Task 1: `submitResponse` returns ordinal/total for non-quiz slides

**Files:**
- Modify: `app/play/[code]/actions.ts:50-160`

- [ ] **Step 1: Update the function signature and add the count query**

Replace the body of `submitResponse` between the existing upsert call and the function close. Find this block:

```ts
  const { error } = await supabase.from("responses").upsert(
    {
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: valueText,
      value_index: valueIndex,
      response_ms: responseMs,
    },
    { onConflict: "slide_id,participant_id" },
  );
  if (error) throw error;
}
```

Replace with:

```ts
  const { error } = await supabase.from("responses").upsert(
    {
      slide_id: input.slideId,
      participant_id: input.participantId,
      value_text: valueText,
      value_index: valueIndex,
      response_ms: responseMs,
    },
    { onConflict: "slide_id,participant_id" },
  );
  if (error) throw error;

  // Non-quiz slides: return submission stats so the audience client can show
  // a "Nth in" takeover. Quiz slides skip this; the takeover for quiz fires on
  // local timer expiry, not on submit.
  if (slide.type !== "quiz") {
    const { count } = await supabase
      .from("responses")
      .select("*", { count: "exact", head: true })
      .eq("slide_id", input.slideId);
    return { ordinal: count ?? 1, total: count ?? 1 };
  }
  return {};
}
```

- [ ] **Step 2: Verify typecheck and lint stay clean**

```bash
npx tsc --noEmit
npx eslint app/play/\[code\]/actions.ts
```

Expected: both exit 0 with no output.

- [ ] **Step 3: Commit**

```bash
git add app/play/\[code\]/actions.ts
git commit -m "feat(audience): submitResponse returns ordinal/total for non-quiz slides"
```

---

## Task 2: Audio helper module

**Files:**
- Create: `lib/audio.ts`

- [ ] **Step 1: Write the helper**

```ts
"use client";

const STORAGE_KEY = "klikr:audio:on";

export function isAudioOn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setAudioOn(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

const CLIPS = {
  submit: "/audio/prize-button.mp3",
  correct: "/audio/quiz-pulse.mp3",
  wrong: null, // vibration only for v1
} as const;

export function playClip(name: keyof typeof CLIPS) {
  if (!isAudioOn()) return;
  const src = CLIPS[name];
  if (!src) return;
  try {
    const a = new Audio(src);
    a.volume = 0.4;
    void a.play().catch(() => {
      /* autoplay-blocked or asset missing — silent no-op */
    });
  } catch {
    /* SSR or unsupported — ignore */
  }
}

export function vibrate(ms = 50) {
  if (!isAudioOn()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* permission denied — ignore */
    }
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/audio.ts
git commit -m "feat(audience): audio + vibrate helper gated by lobby toggle"
```

---

## Task 3: TakeoverContext + `useTakeover` hook

**Files:**
- Create: `components/audience/TakeoverContext.tsx`

- [ ] **Step 1: Write the context, provider, and hook**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type TakeoverPayload =
  | { kind: "quiz-correct"; points: number; rankNow: number; rankBefore: number; total: number }
  | { kind: "quiz-wrong"; correctIndex: number; rankNow: number; total: number }
  | { kind: "quiz-skipped"; rankNow: number; total: number }
  | { kind: "submitted"; ordinal: number; total: number }
  | { kind: "toast"; text: string };

type TakeoverState = {
  payload: TakeoverPayload | null;
  trigger: (p: TakeoverPayload) => void;
  dismiss: () => void;
};

const TakeoverContext = createContext<TakeoverState | null>(null);

const FULL_DURATION_MS = 1800;
const TOAST_DURATION_MS = 1000;

export function TakeoverProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<TakeoverPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPayload(null);
  }, []);

  const trigger = useCallback((next: TakeoverPayload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPayload(next);
    const duration = next.kind === "toast" ? TOAST_DURATION_MS : FULL_DURATION_MS;
    timerRef.current = setTimeout(() => {
      setPayload(null);
      timerRef.current = null;
    }, duration);
  }, []);

  // Esc dismisses early.
  useEffect(() => {
    if (!payload) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payload, dismiss]);

  const value = useMemo(() => ({ payload, trigger, dismiss }), [payload, trigger, dismiss]);
  return <TakeoverContext.Provider value={value}>{children}</TakeoverContext.Provider>;
}

export function useTakeover(): TakeoverState {
  const ctx = useContext(TakeoverContext);
  if (!ctx) throw new Error("useTakeover must be used inside TakeoverProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/audience/TakeoverContext.tsx
git commit -m "feat(audience): TakeoverContext + useTakeover hook"
```

---

## Task 4: CSS keyframes for takeover variants

**Files:**
- Modify: `app/globals.css` (append at end)

- [ ] **Step 1: Append the new classes**

Append the following block at the end of `app/globals.css`:

```css
/* === Audience Takeover === */

.takeover-bg-correct,
.takeover-bg-wrong,
.takeover-bg-submit,
.takeover-bg-skipped {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white;
  text-align: center;
  padding: 24px;
  gap: 12px;
  overflow: hidden;
}

.takeover-bg-correct  { background: linear-gradient(135deg, #22c55e 0%, #14b8a6 100%); }
.takeover-bg-wrong    { background: linear-gradient(135deg, #ef4444 0%, #7c3aed 100%); }
.takeover-bg-submit   { background: linear-gradient(135deg, #0071e3 0%, #ff3366 100%); }
.takeover-bg-skipped  { background: linear-gradient(135deg, #64748b 0%, #334155 100%); }

.takeover-bg-correct::before,
.takeover-bg-wrong::before,
.takeover-bg-submit::before {
  content: "";
  position: absolute;
  inset: -25%;
  background: inherit;
  filter: blur(40px);
  opacity: 0.6;
  animation: takeoverDrift 4s ease-in-out infinite alternate;
  will-change: transform;
}

@keyframes takeoverDrift {
  from { transform: translate3d(-3%, -2%, 0) scale(1.05); }
  to   { transform: translate3d( 3%,  2%, 0) scale(1.10); }
}

.takeover-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: takeoverEnter 0.45s cubic-bezier(0.34, 1.86, 0.5, 1) both;
}

@keyframes takeoverEnter {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.big-num-pop {
  display: inline-block;
  animation: bigNumPop 0.7s cubic-bezier(0.34, 1.86, 0.5, 1) both;
}

@keyframes bigNumPop {
  from { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  to   { transform: scale(1);   opacity: 1; }
}

.shake-burst {
  animation: shakeBurst 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shakeBurst {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-12px); }
  20%, 40%, 60%, 80% { transform: translateX(12px); }
}

.takeover-toast {
  position: fixed;
  z-index: 80;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #0071e3 0%, #ff3366 100%);
  color: white;
  padding: 12px 18px;
  border-radius: 16px;
  font-weight: 700;
  box-shadow: 0 10px 40px rgba(255, 51, 102, 0.45);
  animation: toastSlideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

@keyframes toastSlideUp {
  from { transform: translate(-50%, 50px); opacity: 0; }
  to   { transform: translate(-50%, 0);    opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .takeover-bg-correct::before,
  .takeover-bg-wrong::before,
  .takeover-bg-submit::before { animation: none; }
  .takeover-content,
  .big-num-pop,
  .takeover-toast { animation: takeoverFadeIn 0.2s ease both; }
  .shake-burst { animation: none; }
}

@keyframes takeoverFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 2: Visual smoke check (manual)**

Add a temporary div in `app/page.tsx` like `<div className="takeover-bg-correct"><div className="takeover-content"><span className="big-num-pop">#2</span></div></div>`, run `npm run dev`, open `http://localhost:3000`, confirm the gradient drifts and the number pops in. Remove the temporary div before committing.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(audience): takeover keyframes (drift, pop, toast, shake)"
```

---

## Task 5: TakeoverLayer overlay component

**Files:**
- Create: `components/audience/takeover-variants.tsx`
- Create: `components/audience/TakeoverLayer.tsx`

- [ ] **Step 1: Write the variant sub-components**

```tsx
"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";
import { MiniConfettiBurst } from "../QuizFeedback";

export function QuizCorrectVariant({
  points, rankNow, rankBefore, total,
}: { points: number; rankNow: number; rankBefore: number; total: number }) {
  const delta = rankBefore - rankNow; // positive = climbed
  return (
    <div className="takeover-content">
      <div className="relative">
        <MiniConfettiBurst />
        <CheckCircle className="h-20 w-20" strokeWidth={2.4} />
      </div>
      <div className="text-xs uppercase tracking-widest opacity-90">+{points} pts</div>
      <div className="big-num-pop text-7xl font-extrabold leading-none">#{rankNow}</div>
      <div className="text-xs uppercase tracking-widest opacity-90">
        {delta > 0 ? `↑ from #${rankBefore}` : delta < 0 ? `↓ from #${rankBefore}` : `held #${rankNow}`} · of {total}
      </div>
    </div>
  );
}

export function QuizWrongVariant({
  rankNow, total,
}: { rankNow: number; total: number }) {
  return (
    <div className="takeover-content shake-burst">
      <XCircle className="h-20 w-20" strokeWidth={2.4} />
      <div className="text-2xl font-bold">Not quite</div>
      <div className="big-num-pop text-7xl font-extrabold leading-none">#{rankNow}</div>
      <div className="text-xs uppercase tracking-widest opacity-90">of {total}</div>
    </div>
  );
}

export function QuizSkippedVariant({
  rankNow, total,
}: { rankNow: number; total: number }) {
  return (
    <div className="takeover-content">
      <Clock className="h-20 w-20" strokeWidth={2.4} />
      <div className="text-2xl font-bold">Time&apos;s up</div>
      <div className="big-num-pop text-7xl font-extrabold leading-none">#{rankNow}</div>
      <div className="text-xs uppercase tracking-widest opacity-90">of {total}</div>
    </div>
  );
}

export function SubmittedVariant({
  ordinal, total,
}: { ordinal: number; total: number }) {
  const ordSuffix = ordinalSuffix(ordinal);
  return (
    <div className="takeover-content">
      <div className="text-xs uppercase tracking-widest opacity-90">Submitted</div>
      <div className="big-num-pop text-6xl font-extrabold leading-none">{ordinal}{ordSuffix} in!</div>
      <div className="text-xs uppercase tracking-widest opacity-90">{total} of {total} so far</div>
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
```

- [ ] **Step 2: Write the overlay component**

```tsx
"use client";

import { useEffect } from "react";
import { useTakeover, type TakeoverPayload } from "./TakeoverContext";
import { playClip, vibrate } from "@/lib/audio";
import {
  QuizCorrectVariant,
  QuizWrongVariant,
  QuizSkippedVariant,
  SubmittedVariant,
} from "./takeover-variants";

export function TakeoverLayer() {
  const { payload, dismiss } = useTakeover();

  // Audio + haptics — fire once per payload.
  useEffect(() => {
    if (!payload) return;
    if (payload.kind === "quiz-correct") {
      playClip("correct");
      vibrate(80);
    } else if (payload.kind === "quiz-wrong") {
      vibrate(120);
    } else if (payload.kind === "submitted" || payload.kind === "toast") {
      playClip("submit");
      vibrate(40);
    }
  }, [payload]);

  if (!payload) return null;
  if (payload.kind === "toast") {
    return (
      <div className="takeover-toast" role="status" aria-live="polite">
        {payload.text}
      </div>
    );
  }

  return (
    <div
      className={bgClass(payload)}
      role="status"
      aria-live="polite"
      onClick={dismiss}
    >
      {renderVariant(payload)}
    </div>
  );
}

function bgClass(p: TakeoverPayload): string {
  switch (p.kind) {
    case "quiz-correct": return "takeover-bg-correct";
    case "quiz-wrong":   return "takeover-bg-wrong";
    case "quiz-skipped": return "takeover-bg-skipped";
    case "submitted":    return "takeover-bg-submit";
    default: return "";
  }
}

function renderVariant(p: TakeoverPayload) {
  switch (p.kind) {
    case "quiz-correct": return <QuizCorrectVariant {...p} />;
    case "quiz-wrong":   return <QuizWrongVariant {...p} />;
    case "quiz-skipped": return <QuizSkippedVariant {...p} />;
    case "submitted":    return <SubmittedVariant {...p} />;
    default: return null;
  }
}
```

- [ ] **Step 3: Verify typecheck and lint**

```bash
npx tsc --noEmit
npx eslint components/audience/
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/audience/
git commit -m "feat(audience): TakeoverLayer overlay + variant components"
```

---

## Task 6: Wire AudienceView root + non-quiz one-and-done slides

**Files:**
- Modify: `components/AudienceView.tsx`

- [ ] **Step 1: Import provider, layer, and hook at top of file**

After the existing import block (around line 11), add:

```tsx
import { TakeoverProvider, useTakeover } from "./audience/TakeoverContext";
import { TakeoverLayer } from "./audience/TakeoverLayer";
```

- [ ] **Step 2: Wrap the rendered tree in `<TakeoverProvider>` + `<TakeoverLayer/>`**

The exported `AudienceView` function returns one of three branches (lobby, closed, active). Replace each `return ( … )` body so it is wrapped, e.g.:

```tsx
  if (presentation.state === "lobby") {
    return (
      <TakeoverProvider>
        <Stage>{/* …existing lobby content… */}</Stage>
        <TakeoverLayer />
      </TakeoverProvider>
    );
  }
```

Apply the same wrap to the `closed` and `active` branches. The provider must wrap `TakeoverLayer` (so the layer reads context) and any subtree that calls `useTakeover`.

- [ ] **Step 3: Wire the four one-and-done slide types**

Each existing `submitResponse({ … })` call for `mcq`, `rating`, `ranking`, `open` slide types currently looks like:

```tsx
            await submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: i });
```

Replace each with:

```tsx
            const res = await submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: i });
            if (res && "ordinal" in res) {
              trigger({ kind: "submitted", ordinal: res.ordinal, total: res.total });
            }
```

The four call sites in current `AudienceView.tsx`:
- line ~303 (multi-MCQ confirm submit) — keep `valueText` arg as-is, change handling of return
- line ~367 (single MCQ button) — replace as shown above
- line ~425 (rating tap) — same shape
- line ~619 (ranking submit) — same shape, uses `valueText`
- line ~699 (open text submit) — same shape, uses `valueText`
- line ~896 (rating numeric variant) — same shape

Each enclosing component (`MCQ`, `Rating`, `Ranking`, `Open`) must call `const { trigger } = useTakeover();` near the top of the function body. Since these are nested inside `AudienceView`, the provider added in Step 2 already covers them.

- [ ] **Step 4: Update the action's TypeScript return type expectation**

The action returns `Promise<{ ordinal: number; total: number } | {}>`. The `if (res && "ordinal" in res)` narrowing handles both shapes safely. No changes to `actions.ts` types needed.

- [ ] **Step 5: Verify typecheck and lint**

```bash
npx tsc --noEmit
npx eslint components/AudienceView.tsx
```

Expected: both exit 0.

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Open a presentation as host in one tab, join as audience in another, advance to an MCQ slide and submit — confirm the full-screen blue-pink takeover appears for ~1.8s with "1st in!" / "2 of 2 so far". Repeat for rating, ranking, open.

- [ ] **Step 7: Commit**

```bash
git add components/AudienceView.tsx
git commit -m "feat(audience): wire mcq/rating/ranking/open submits to takeover"
```

---

## Task 7: Wire wordcloud + qa multi-submit toasts

**Files:**
- Modify: `components/AudienceView.tsx`

- [ ] **Step 1: Wordcloud submit (around line 303)**

Find the wordcloud submit block. Wrap the existing `submitResponse(...)` call so the success path triggers the toast:

```tsx
            await submitResponse({ slideId: slide.id, participantId, participantToken, valueText: word.trim() });
            trigger({ kind: "toast", text: "🌪 Word in!" });
```

- [ ] **Step 2: QA submit (find `submitQuestion(`)**

Around line ~720 (inside the `QA` component) where `submitQuestion(...)` is called:

```tsx
            await submitQuestion({ slideId: slide.id, participantId, participantToken, text });
            trigger({ kind: "toast", text: "🙋 Question in!" });
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npx eslint components/AudienceView.tsx
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/AudienceView.tsx
git commit -m "feat(audience): wordcloud + qa submits show bottom toast"
```

---

## Task 8: Replace Quiz reveal block with takeover trigger

**Files:**
- Modify: `components/AudienceView.tsx` (the `Quiz` sub-component, lines ~492–550)

- [ ] **Step 1: Add rank fetch + takeover trigger on expiry**

Inside `Quiz`, after the existing `useEffect` that resets `picked` on slide change, add a new effect that fires when `expired` flips to `true`:

```tsx
  const { trigger } = useTakeover();

  // Reveal moment: timer just expired. Fetch the latest leaderboard, derive
  // our rank + just-earned points, and fire the takeover. Refs persist
  // across consecutive quiz slides so we can render rank-delta and
  // just-earned points (cumulative_now - cumulative_before).
  const prevRankRef = useRef<number | null>(null);
  const prevScoreRef = useRef<number>(0);
  useEffect(() => {
    if (!expired) return;
    let cancelled = false;
    (async () => {
      const list = await getParticipantScores({
        presentationId,
        participantId,
        participantToken,
      });
      if (cancelled) return;
      const total = list.length;
      const rankNow = Math.max(1, list.findIndex((p) => p.id === participantId) + 1);
      const rankBefore = prevRankRef.current ?? total;
      prevRankRef.current = rankNow;

      const me = list.find((p) => p.id === participantId);
      const cumulativeScore = me?.score ?? 0;
      const justEarned = Math.max(0, cumulativeScore - prevScoreRef.current);
      prevScoreRef.current = cumulativeScore;

      const isCorrect = picked !== null && picked === cfg.correct_index;
      const didNotAnswer = picked === null;
      if (didNotAnswer) {
        trigger({ kind: "quiz-skipped", rankNow, total });
      } else if (isCorrect) {
        trigger({ kind: "quiz-correct", points: justEarned, rankNow, rankBefore, total });
      } else {
        trigger({ kind: "quiz-wrong", correctIndex: cfg.correct_index, rankNow, total });
      }
    })();
    return () => { cancelled = true; };
  }, [expired, cfg.correct_index, participantId, participantToken, presentationId, picked, trigger]);
```

Add the missing imports at the top of the file if they're not already present:

```tsx
import { useRef } from "react";
import { getParticipantScores } from "@/app/play/[code]/actions";
```

(Note: `getParticipantScores` is already imported via `submitResponse`'s namespace — confirm by reading line 6 and add only what's missing.)

- [ ] **Step 2: Delete the inline reveal JSX**

Remove the entire `if (expired) { return ( … RevealMedal … ScoreCard … ) }` block (lines ~534–550 in the current file). The takeover layer renders the reveal now.

The pre-reveal "Locked in" block (~lines 522–531) STAYS — it's the inline confirmation while the timer counts down.

- [ ] **Step 3: Drop the now-unused imports**

At the top of `AudienceView.tsx`, remove the import of `RevealMedal, ScoreCard` from `./QuizFeedback`. If `MiniConfettiBurst` or `encouragementFor` are not imported, leave the import line removed entirely.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint components/AudienceView.tsx
```

Expected: both exit 0. If TypeScript complains about `getParticipantScores` not being imported, add it.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`. Host a presentation with one Kahoot quiz slide. Join as audience, answer correctly — confirm the green/teal takeover with rank appears on timer expiry. Answer incorrectly — red/purple shake. Don't answer — gray skipped variant.

- [ ] **Step 6: Commit**

```bash
git add components/AudienceView.tsx
git commit -m "feat(audience): quiz reveal moves to TakeoverLayer (timer-driven)"
```

---

## Task 9: Wire KahootAudienceView reveal through takeover

**Files:**
- Modify: `components/KahootAudienceView.tsx`

- [ ] **Step 1: Read the file to locate `PostQuizFeedback`**

```bash
grep -n "PostQuizFeedback\|RevealMedal\|ScoreCard\|expired" components/KahootAudienceView.tsx
```

Expected output: `PostQuizFeedback` definition around line 110 with `RevealMedal` + `ScoreCard` JSX inside.

- [ ] **Step 2: Replace `PostQuizFeedback` with takeover trigger**

Delete the entire `PostQuizFeedback` component (it lives in the same file). In the parent component (`KahootAudienceView`), add the imports and effect:

```tsx
import { useEffect, useRef } from "react";
import { useTakeover } from "./audience/TakeoverContext";
import { getParticipantScores } from "@/app/play/[code]/actions";

// inside KahootAudienceView, near other hooks:
const { trigger } = useTakeover();
const prevRankRef = useRef<number | null>(null);
const prevScoreRef = useRef<number>(0);
useEffect(() => {
  if (!expired) return;
  let cancelled = false;
  (async () => {
    const list = await getParticipantScores({ presentationId, participantId, participantToken });
    if (cancelled) return;
    const total = list.length;
    const rankNow = Math.max(1, list.findIndex((p) => p.id === participantId) + 1);
    const rankBefore = prevRankRef.current ?? total;
    prevRankRef.current = rankNow;
    const me = list.find((p) => p.id === participantId);
    const cumulativeScore = me?.score ?? 0;
    const justEarned = Math.max(0, cumulativeScore - prevScoreRef.current);
    prevScoreRef.current = cumulativeScore;
    const isCorrect = picked !== null && picked === cfg.correct_index;
    const didNotAnswer = picked === null;
    if (didNotAnswer) trigger({ kind: "quiz-skipped", rankNow, total });
    else if (isCorrect) trigger({ kind: "quiz-correct", points: justEarned, rankNow, rankBefore, total });
    else trigger({ kind: "quiz-wrong", correctIndex: cfg.correct_index, rankNow, total });
  })();
  return () => { cancelled = true; };
}, [expired, cfg.correct_index, participantId, participantToken, presentationId, picked, trigger]);
```

Replace the JSX path that previously rendered `<PostQuizFeedback ... />` with a simple "submitted, waiting for reveal" placeholder (or render nothing — the takeover layer covers the whole screen anyway). KahootAudienceView's tile-picker JSX stays intact for the pre-reveal phase.

- [ ] **Step 3: Drop `RevealMedal`/`ScoreCard` import + the inline `vibrate` call**

The `vibrate` call inside the tile-pick handler (~line 83) is now redundant — `playClip("submit") + vibrate(40)` fires from the TakeoverLayer's effect. Delete the `if (… "vibrate" in navigator) navigator.vibrate(50);` line.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint components/KahootAudienceView.tsx
```

Expected: both exit 0.

- [ ] **Step 5: Manual smoke test**

Same as Task 8 Step 5, but on a Kahoot-mode quiz slide.

- [ ] **Step 6: Commit**

```bash
git add components/KahootAudienceView.tsx
git commit -m "feat(audience): Kahoot reveal moves to TakeoverLayer"
```

---

## Task 10: Shrink QuizFeedback.tsx

**Files:**
- Modify: `components/QuizFeedback.tsx`

- [ ] **Step 1: Confirm the only remaining consumer is AudienceFinalResults**

```bash
grep -rn "from \"./QuizFeedback\"\|from \"\./components/QuizFeedback\"\|from \"@/components/QuizFeedback\"" --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v .next
```

Expected: only `components/AudienceFinalResults.tsx` importing `encouragementFor`. If anything else still imports `RevealMedal`/`ScoreCard`, the previous tasks weren't completed correctly — go back and fix.

- [ ] **Step 2: Delete `RevealMedal`, `ScoreCard`, and any helpers used only by them**

Open `components/QuizFeedback.tsx`, remove the `RevealMedal` and `ScoreCard` exports plus any internal helpers (e.g. local fetch effects) that were only used by them. Keep `encouragementFor` and `MiniConfettiBurst` (the latter is now imported by `takeover-variants.tsx`).

- [ ] **Step 3: Update import in `takeover-variants.tsx` if needed**

`takeover-variants.tsx` imports `MiniConfettiBurst` from `../QuizFeedback`. Make sure that export is still present after the shrink.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint components/QuizFeedback.tsx components/AudienceFinalResults.tsx
```

Expected: exit 0. Confirm `grep -rn "RevealMedal\\|ScoreCard"` shows zero remaining usages outside `components/QuizFeedback.tsx`'s own deletion site.

- [ ] **Step 5: Commit**

```bash
git add components/QuizFeedback.tsx
git commit -m "refactor(audience): drop RevealMedal/ScoreCard, keep encouragementFor + MiniConfettiBurst"
```

---

## Task 11: Audio toggle on lobby form

**Files:**
- Modify: `components/AudienceView.tsx` (the `NicknameForm` component, search for `function NicknameForm`)

- [ ] **Step 1: Add a small speaker toggle at the top of the form**

Inside `NicknameForm`, add local state synced with `lib/audio`:

```tsx
import { isAudioOn, setAudioOn } from "@/lib/audio";
import { Volume2, VolumeX } from "lucide-react";

// inside NicknameForm:
const [audio, setAudio] = useState(false);
useEffect(() => { setAudio(isAudioOn()); }, []);
```

Inside the form's JSX, near the top, add:

```tsx
<button
  type="button"
  className="absolute right-4 top-4 rounded-full p-2 text-muted hover:text-fg"
  aria-label={audio ? "Mute sounds" : "Enable sounds"}
  onClick={() => { const next = !audio; setAudioOn(next); setAudio(next); }}
>
  {audio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
</button>
```

Make sure the form's wrapper has `position: relative` (likely already does — verify in the existing JSX).

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npx eslint components/AudienceView.tsx
```

Expected: exit 0.

- [ ] **Step 3: Manual smoke test**

Join a session, click the speaker icon, submit on an MCQ slide — confirm `prize-button.mp3` plays. Toggle off, submit again — silence. Verify localStorage `klikr:audio:on` value flips between `0` and `1` in devtools.

- [ ] **Step 4: Commit**

```bash
git add components/AudienceView.tsx
git commit -m "feat(audience): lobby speaker toggle for sound + haptics"
```

---

## Task 12: E2E coverage for takeover

**Files:**
- Create: `e2e/audience-takeover.spec.ts`

- [ ] **Step 1: Write the spec, modeled on existing e2e patterns**

Read `e2e/_helpers.ts` first to use the project's existing seed/sign-in helpers:

```bash
cat e2e/_helpers.ts | head -80
```

Then create `e2e/audience-takeover.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { seedPresentation, joinAsAudience } from "./_helpers";

test("submitted variant fires on mcq submit and shows ordinal/total", async ({ page }) => {
  const { code } = await seedPresentation([
    { type: "mcq", config: { question: "Color?", options: ["red", "blue"], multi: false } },
  ]);
  await joinAsAudience(page, code, "alex");
  await page.getByRole("button", { name: /red/i }).click();
  await expect(page.getByText(/1st in/i)).toBeVisible({ timeout: 2000 });
});

test("toast variant fires on wordcloud submit and does not block second submit", async ({ page }) => {
  const { code } = await seedPresentation([
    { type: "wordcloud", config: { question: "Words", max_words: 3 } },
  ]);
  await joinAsAudience(page, code, "alex");
  await page.getByPlaceholder(/word/i).fill("first");
  await page.getByRole("button", { name: /submit|add/i }).click();
  await expect(page.getByText(/word in/i)).toBeVisible({ timeout: 1500 });
  // Second submit should not be blocked by the toast.
  await page.getByPlaceholder(/word/i).fill("second");
  await page.getByRole("button", { name: /submit|add/i }).click();
  await expect(page.getByText(/word in/i)).toBeVisible({ timeout: 1500 });
});

test("quiz reveal fires when timer expires", async ({ page }) => {
  const { code } = await seedPresentation([
    {
      type: "quiz",
      config: { question: "2+2", options: ["3", "4"], correct_index: 1, time_limit_s: 2 },
    },
  ]);
  await joinAsAudience(page, code, "alex");
  await page.getByRole("button", { name: /^4$/ }).click();
  await expect(page.getByText(/locked in/i)).toBeVisible();
  await expect(page.locator(".takeover-bg-correct")).toBeVisible({ timeout: 4000 });
});

test("CI guard: no remaining RevealMedal / ScoreCard imports outside QuizFeedback.tsx", async () => {
  const { execSync } = await import("node:child_process");
  const out = execSync(
    "grep -rn 'RevealMedal\\|ScoreCard' --include='*.ts' --include='*.tsx' app components lib || true",
  ).toString();
  // Only allowed match: definitions inside QuizFeedback.tsx itself (which should now be empty of these two).
  const offending = out
    .split("\n")
    .filter(Boolean)
    .filter((l) => !l.startsWith("components/QuizFeedback.tsx:"));
  expect(offending, `Stray RevealMedal/ScoreCard usage:\n${offending.join("\n")}`).toEqual([]);
});
```

If `_helpers.ts` does not export `seedPresentation` / `joinAsAudience` with these exact signatures, adapt to whatever the existing helpers expose (look at `e2e/audience-flow.spec.ts` for canonical patterns).

- [ ] **Step 2: Run the new spec headed against a local dev server**

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run dev &
DEV_PID=$!
sleep 6
npx playwright test e2e/audience-takeover.spec.ts --reporter=list
kill $DEV_PID
```

Expected: all four tests pass.

- [ ] **Step 3: Run the full e2e suite to catch regressions**

```bash
npm run test:e2e
```

Expected: every existing spec still passes (scoring, podium, slide-types, audience-flow, landing, reactions).

- [ ] **Step 4: Commit**

```bash
git add e2e/audience-takeover.spec.ts
git commit -m "test(audience): e2e coverage for takeover variants + CI guard"
```

---

## Task 13: Final integration check + push

**Files:** none

- [ ] **Step 1: Whole-project typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: both exit 0.

- [ ] **Step 2: Read the diff for any regressions**

```bash
git log --oneline origin/fix/quiz-score-forgery..HEAD
git diff origin/fix/quiz-score-forgery...HEAD --stat
```

Expected: ~12 commits since the security fix, ~10 files changed.

- [ ] **Step 3: Push**

```bash
git push origin fix/quiz-score-forgery
```

Expected: branch updated. PR #1's preview deploy on Vercel rebuilds with the new commits — exercise the audience side on the preview URL before merging.

- [ ] **Step 4: Update PR #1 description**

```bash
gh pr edit 1 --body "<existing body>

---

Adds full-screen takeover engagement layer per [spec](docs/superpowers/specs/2026-05-10-audience-engagement-takeover-design.md). 13 tasks shipped from [plan](docs/superpowers/plans/2026-05-10-audience-engagement-takeover.md)."
```

---

## Self-review checklist (run after the plan is written)

- [x] Spec coverage: every spec section is covered by at least one task (architecture → 3-5; data flow → 1; animation library → 4; sound → 2, 11; testing → 12; cleanup → 10).
- [x] Placeholder scan: no "TBD", no "implement later", no vague "add error handling". Edge cases are concrete (closed session, expired timer, missing audio).
- [x] Type consistency: `TakeoverPayload` shape is identical across Tasks 3, 5, 6, 8, 9. `trigger` signature unchanged.
- [x] Out-of-scope items (calm/hype toggle, animated rank graph, audio sourcing, embed engagement) explicitly excluded in the spec and not present in any task.
