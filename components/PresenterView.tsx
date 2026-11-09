"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, ResponseRow, Participant } from "@/lib/types";
import { startPresentation, moveSlide, endPresentation, scoreActiveQuizSlide } from "@/app/present/[id]/actions";
import { setQuestionStatus } from "@/app/play/[code]/actions";
import { ResultsBarChart, QuizCountdown } from "./ResultsBarChart";
import { WordCloudView } from "./WordCloudView";
import { OpenResponses } from "./OpenResponses";
import { Leaderboard } from "./Leaderboard";
import { QAStream } from "./QAStream";
import { RatingDistribution } from "./RatingDistribution";
import { ResultsRanking } from "./ResultsRanking";
import { ReactionOverlay } from "./ReactionOverlay";
import { EmbedSlide } from "./EmbedSlide";
import { KahootPresenterView } from "./KahootPresenterView";
import { QuizPodium } from "./QuizPodium";
import { LeaderboardRows, sortByScore, useStagedRows } from "./LeaderboardRows";
import { QrCode } from "./QrCode";
import { PresenterMusicProvider, PresenterMusicToggle } from "./PresenterMusicToggle";
import { SessionStatusPill } from "./SessionStatusPill";
import { PresenterShortcutsHelp } from "./PresenterShortcutsHelp";
import { Keyboard, Maximize2, Minimize2, FastForward, Flame, TrendingUp } from "lucide-react";
import type { EmbedConfig, QAConfig } from "@/lib/types";
import { useBufferedState } from "@/lib/useBufferedState";
import { pinRealtimeAuth } from "@/lib/realtime";
import { startedAtFor } from "@/lib/liveTiming";
import { serverNow } from "@/lib/serverClock";
import { playPresenterClip } from "@/lib/audio";
import { MiniConfettiBurst } from "./QuizFeedback";

// Only the columns the presenter screens read — `select("*")` shipped every
// column of every response on each refetch.
const RESPONSE_COLS = "id, slide_id, participant_id, value_text, value_index, response_ms, created_at, status, pinned, flagged";
const PARTICIPANT_COLS = "id, presentation_id, nickname, score, created_at";

type RoundBaseline = Map<string, { id: string; nickname: string; score: number; rank: number }>;

export function PresenterView(props: {
  presentation: Presentation;
  slides: Slide[];
  joinUrl: string;
  displayJoinUrl: string;
}) {
  // Music lives above the lobby/live/closed switch so it keeps playing (and
  // isn't re-downloaded) when the host presses Start.
  return (
    <PresenterMusicProvider>
      <PresenterViewInner {...props} />
    </PresenterMusicProvider>
  );
}

function PresenterViewInner({
  presentation: initialPresentation,
  slides,
  joinUrl,
  displayJoinUrl,
}: {
  presentation: Presentation;
  slides: Slide[];
  joinUrl: string;
  displayJoinUrl: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [presentation, setPresentation] = useState(initialPresentation);
  // Realtime-fed lists apply in per-frame batches (useBufferedState): a burst
  // of answers re-renders the presenter once per frame, not once per answer.
  const [responses, enqueueResponses, setResponses] = useBufferedState<ResponseRow[]>([]);
  const [participants, enqueueParticipants, setParticipants] = useBufferedState<Participant[]>([]);
  // Stable id → nickname lookup for the quiz screen (memoised so the memo'd
  // KahootPresenterView only re-renders when the roster actually changes).
  const nicknames = useMemo(() => new Map(participants.map((p) => [p.id, p.nickname])), [participants]);
  const [modeOverride, setModeOverride] = useState<"light" | "dark" | null>(null);
  const [scoredSlideIds, setScoredSlideIds] = useState<Set<string>>(() => new Set());
  const [expiredQuizSlideIds, setExpiredQuizSlideIds] = useState<Set<string>>(() => new Set());
  const [leaderboardSlideId, setLeaderboardSlideId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const navBusyRef = useRef(false);

  // Optional auto-advance: after a quiz is scored, automatically show the
  // leaderboard then move to the next question on a timer. Off by default; the
  // host stays in control — any manual nav cancels the pending sequence.
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const autoTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setAutoAdvance(localStorage.getItem("klikr:autoadvance") === "on");
    } catch {}
  }, []);
  const clearAutoTimers = useCallback(() => {
    autoTimersRef.current.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    autoTimersRef.current = [];
    setAutoCountdown(null);
  }, []);
  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance((v) => {
      const next = !v;
      try {
        localStorage.setItem("klikr:autoadvance", next ? "on" : "off");
      } catch {}
      if (!next) clearAutoTimers();
      return next;
    });
  }, [clearAutoTimers]);
  // Safety net: clear any pending sequence whenever the active slide changes
  // (manual nav, realtime advance, unmount) so it never fires onto a new slide.
  useEffect(() => {
    return () => clearAutoTimers();
  }, [presentation.current_slide_id, clearAutoTimers]);

  // Track fullscreen state — handles user-driven Esc + button taps + keyboard.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`klikr-present-mode-${initialPresentation.id}`);
      if (stored === "light" || stored === "dark") setModeOverride(stored);
    } catch {}
  }, [initialPresentation.id]);

  const effectiveMode: "light" | "dark" =
    modeOverride ?? (presentation.theme?.mode === "dark" ? "dark" : "light");

  // Drive the global page theme so the entire viewport background flips —
  // not just an inner panel. The dashboard / other pages reapply their own
  // preference on mount, so we don't bother restoring on unmount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", effectiveMode);
  }, [effectiveMode]);

  function toggleMode() {
    const next: "light" | "dark" = effectiveMode === "dark" ? "light" : "dark";
    setModeOverride(next);
    try {
      localStorage.setItem(`klikr-present-mode-${initialPresentation.id}`, next);
    } catch {}
  }

  const currentSlideId = presentation.current_slide_id;
  const currentSlide = useMemo(
    () => slides.find((s) => s.id === currentSlideId) ?? null,
    [slides, currentSlideId],
  );
  const quizSlides = useMemo(() => slides.filter((s) => s.type === "quiz"), [slides]);

  const stateRef = useRef(presentation.state);
  useEffect(() => {
    stateRef.current = presentation.state;
  }, [presentation.state]);

  const loadParticipants = useCallback(() => {
    return supabase
      .from("participants")
      .select(PARTICIPANT_COLS)
      .eq("presentation_id", presentation.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .returns<Participant[]>()
      .then(({ data }) => {
        if (data) setParticipants(data);
      });
  }, [supabase, presentation.id, setParticipants]);

  useEffect(() => {
    let realtimeOk = false;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // Filtered to THIS presentation. (The filter was once dropped, so every
    // join/score on the platform reached every live presenter; the real cause
    // of the missing events was the socket joining as `anon` — fixed by
    // pinning the session JWT first.)
    (async () => {
      await pinRealtimeAuth(supabase);
      if (cancelled) return;
      channel = supabase
        .channel(`pres-${presentation.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "presentations", filter: `id=eq.${presentation.id}` },
          (payload) => setPresentation((prev) => ({ ...prev, ...(payload.new as Presentation) })),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "participants", filter: `presentation_id=eq.${presentation.id}` },
          (payload) => {
            const fresh = payload.new as Participant;
            enqueueParticipants((prev) => (prev.some((p) => p.id === fresh.id) ? prev : [...prev, fresh]));
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "participants", filter: `presentation_id=eq.${presentation.id}` },
          (payload) => {
            const fresh = payload.new as Participant;
            enqueueParticipants((prev) => prev.map((p) => (p.id === fresh.id ? { ...p, ...fresh } : p)));
          },
        )
        .subscribe((status) => {
          realtimeOk = status === "SUBSCRIBED";
        });
    })();

    // Initial load for instant first paint. After that realtime keeps the
    // roster fresh; the fast interval only fetches while the websocket is down
    // (Railway can drop it), so a healthy session has no re-render churn.
    // The slow interval is a belt-and-suspenders safety net: a channel can
    // report "SUBSCRIBED" while still silently dropping specific row events,
    // and a host staring at a lobby that never updates has no other way to
    // notice — so we never go fully quiet.
    loadParticipants();
    const fastPoll = setInterval(() => {
      if (!realtimeOk) loadParticipants();
    }, 5000);
    // In the lobby the roster IS the screen, so the safety net runs every 5s
    // there (one tiny query for one host); during the game, every 20s.
    let ticks = 0;
    const safetyPoll = setInterval(() => {
      ticks += 1;
      if (!realtimeOk || document.visibilityState !== "visible") return;
      if (stateRef.current === "lobby" || ticks % 4 === 0) loadParticipants();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(fastPoll);
      clearInterval(safetyPoll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, presentation.id, loadParticipants, enqueueParticipants]);

  // Refetch the roster the instant any quiz slide is scored. The host already
  // reloads on its own timer-expiry and gets participant realtime, but this
  // also covers the moveSlide / endPresentation scoring paths (and flaky
  // realtime) by reacting to the scored_rev bump on the presentations row.
  useEffect(() => {
    loadParticipants();
  }, [presentation.scored_rev, loadParticipants]);

  useEffect(() => {
    setLeaderboardSlideId(null);
  }, [currentSlideId]);

  // Standings as each quiz question starts — the between-question
  // leaderboard animates from here to the new totals.
  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  const [roundBaseline, setRoundBaseline] = useState<RoundBaseline | null>(null);
  const baselineSlideRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentSlide || currentSlide.type !== "quiz") return;
    if (baselineSlideRef.current === currentSlide.id) return;
    baselineSlideRef.current = currentSlide.id;
    const ranked = sortByScore(participantsRef.current);
    setRoundBaseline(
      new Map(ranked.map((p, i) => [p.id, { id: p.id, nickname: p.nickname, score: p.score, rank: i + 1 }])),
    );
  }, [currentSlide]);

  useEffect(() => {
    if (!currentSlideId) {
      setResponses([]);
      return;
    }
    let cancelled = false;
    let realtimeOk = false;
    const fetchResponses = () => {
      supabase
        .from("responses")
        .select(RESPONSE_COLS)
        .eq("slide_id", currentSlideId)
        .returns<ResponseRow[]>()
        .then(({ data }) => {
          if (!cancelled && data) setResponses(data);
        });
    };
    setResponses([]);
    fetchResponses();
    const channel = supabase
      .channel(`slide-${currentSlideId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `slide_id=eq.${currentSlideId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ResponseRow;
            enqueueResponses((r) => (r.some((x) => x.id === row.id) ? r : [...r, row]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as ResponseRow;
            enqueueResponses((r) => r.map((x) => (x.id === row.id ? row : x)));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as ResponseRow).id;
            enqueueResponses((r) => r.filter((x) => x.id !== id));
          }
        },
      )
      .subscribe((status) => {
        realtimeOk = status === "SUBSCRIBED";
      });

    // Fallback polling for responses too (Word Cloud, Polls, etc) — the fast
    // interval only fires while the websocket is down, so a healthy session
    // re-renders on real changes. The slow interval is a safety net for the
    // same silent-drop risk as the participants roster above — votes/answers
    // are the whole point of the presenter screen.
    const fastPoll = setInterval(() => {
      if (!realtimeOk) fetchResponses();
    }, 5000);
    const safetyPoll = setInterval(() => {
      if (realtimeOk && document.visibilityState === "visible") fetchResponses();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(fastPoll);
      clearInterval(safetyPoll);
      supabase.removeChannel(channel);
    };
  }, [supabase, currentSlideId, setResponses, enqueueResponses]);

  const themeForShell: Presentation["theme"] = {
    ...(presentation.theme ?? {}),
    mode: effectiveMode,
  };

  // Click Start → flip to "active" immediately rather than waiting on the
  // realtime echo of our own write, which can lag or occasionally never
  // arrive. On failure, revert and show why so the host can retry.
  async function startNow() {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    const prevSlideId = presentation.current_slide_id;
    const prevStartedAt = presentation.current_slide_started_at;
    const first = slides[0] ?? null;
    setPresentation((p) => ({
      ...p,
      state: "active",
      current_slide_id: first?.id ?? null,
      current_slide_started_at: startedAtFor(first?.type, serverNow()),
    }));
    playPresenterClip("whoosh");
    try {
      const res = await startPresentation(presentation.id);
      if (res?.currentSlideStartedAt) {
        setPresentation((p) =>
          p.current_slide_id === res.currentSlideId ? { ...p, current_slide_started_at: res.currentSlideStartedAt } : p,
        );
      }
    } catch (err) {
      console.error("startPresentation failed", err);
      setPresentation((p) => ({ ...p, state: "lobby", current_slide_id: prevSlideId, current_slide_started_at: prevStartedAt }));
      setStartError(err instanceof Error ? err.message : "Couldn't start the session. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  // Optimistic slide navigation: show the target slide immediately, then
  // reconcile with the server's answer (move_slide RPC, one round trip).
  const navigate = useCallback(
    async (direction: "next" | "prev") => {
      if (navBusyRef.current) return;
      const idxNow = slides.findIndex((s) => s.id === presentation.current_slide_id);
      const target = slides[direction === "next" ? idxNow + 1 : idxNow - 1];
      if (!target) return;
      navBusyRef.current = true;
      clearAutoTimers();
      setLeaderboardSlideId(null);
      setNavError(null);
      const prevSlideId = presentation.current_slide_id;
      const prevStartedAt = presentation.current_slide_started_at;
      setPresentation((p) => ({
        ...p,
        current_slide_id: target.id,
        current_slide_started_at: startedAtFor(target.type, serverNow()),
      }));
      try {
        const res = await moveSlide(presentation.id, direction);
        if (res?.moved && res.currentSlideId) {
          setPresentation((p) =>
            p.current_slide_id === res.currentSlideId
              ? { ...p, current_slide_started_at: res.currentSlideStartedAt }
              : { ...p, current_slide_id: res.currentSlideId, current_slide_started_at: res.currentSlideStartedAt },
          );
        } else if (res && !res.moved) {
          // Server says we were already at the edge (another host moved?) —
          // follow the server.
          setPresentation((p) => ({
            ...p,
            current_slide_id: res.currentSlideId,
            current_slide_started_at: res.currentSlideStartedAt,
          }));
        }
      } catch (err) {
        console.error(`moveSlide ${direction} failed`, err);
        setPresentation((p) => ({ ...p, current_slide_id: prevSlideId, current_slide_started_at: prevStartedAt }));
        setNavError(
          err instanceof Error
            ? err.message
            : direction === "next"
              ? "Couldn't advance to the next slide. Check your connection and try again."
              : "Couldn't go back to the previous slide. Check your connection and try again.",
        );
      } finally {
        navBusyRef.current = false;
      }
    },
    [slides, presentation.current_slide_id, presentation.current_slide_started_at, presentation.id, clearAutoTimers],
  );

  // Keyboard shortcuts — host-only, scoped to presentation states.
  // Right / Space → next, Left → prev, F → fullscreen.
  // Ignore when focus is in an input / textarea / contenteditable so editing
  // isn't disrupted.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    if (presentation.state !== "active" && presentation.state !== "lobby") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        if (presentation.state === "active") {
          e.preventDefault();
          void navigateRef.current("next");
        }
      } else if (e.key === "ArrowLeft") {
        if (presentation.state === "active") {
          e.preventDefault();
          void navigateRef.current("prev");
        }
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentation.state, toggleFullscreen]);

  if (presentation.state === "lobby") {
    return (
      <ThemedShell theme={themeForShell}>
        <Lobby
          presentation={presentation}
          participants={participants}
          slidesCount={slides.length}
          joinUrl={joinUrl}
          mode={effectiveMode}
          onToggleMode={toggleMode}
          onStart={startNow}
          starting={starting}
          startError={startError}
        />
      </ThemedShell>
    );
  }

  const hasAnyQuiz = quizSlides.length > 0;

  if (presentation.state === "closed") {
    const startedAt = new Date(presentation.created_at).getTime();
    const durationMs = Math.max(0, Date.now() - startedAt);
    const durMins = Math.floor(durationMs / 60000);
    const durSecs = Math.floor((durationMs % 60000) / 1000);
    const durationLabel = durMins > 0 ? `${durMins}m ${durSecs}s` : `${durSecs}s`;
    const playerLabel = `${participants.length} player${participants.length === 1 ? "" : "s"}`;
    const slideLabel = `${slides.length} slide${slides.length === 1 ? "" : "s"}`;
    return (
      <ThemedShell theme={themeForShell}>
        <div className="flex flex-1 flex-col gap-6">
          <div className="panel anim-scale-in p-12 text-center">
            <div className="pill"><span className="live-dot" /> Session complete</div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Thanks for playing.</h2>
            <p
              className="mono mt-3 text-[11px] uppercase tracking-[0.18em] muted-text"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {playerLabel} · {slideLabel} · {durationLabel}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`/api/export/${presentation.id}/csv`}
                download
                className="btn-ghost text-sm"
              >
                ⬇ Export CSV
              </a>
              <a
                href={`/api/export/${presentation.id}?format=scores`}
                download
                className="btn-ghost text-sm"
                title="Per-participant score per question, as a spreadsheet (opens in Excel)"
              >
                ⬇ Score sheet
              </a>
              <a href="/dashboard" className="btn-primary text-sm">
                Back to dashboard
              </a>
            </div>
          </div>
          {hasAnyQuiz ? (
            <QuizPodium participants={participants} presentationId={presentation.id} />
          ) : null}
        </div>
      </ThemedShell>
    );
  }

  if (!currentSlide) {
    return <p className="muted-text text-sm">No slides.</p>;
  }

  const idx = slides.findIndex((s) => s.id === currentSlide.id);
  const isLast = idx === slides.length - 1;

  const isKahoot = currentSlide.type === "quiz" && currentSlide.kahoot_mode;
  const isQuiz = currentSlide.type === "quiz";
  const qaCfg = currentSlide.type === "qa" ? (currentSlide.config as QAConfig) : null;
  const quizExpired = isQuiz && expiredQuizSlideIds.has(currentSlide.id);
  const showQuizLeaderboard = isQuiz && leaderboardSlideId === currentSlide.id;
  const quizNumber = isQuiz ? quizSlides.findIndex((s) => s.id === currentSlide.id) + 1 : 0;

  async function scoreQuizOnExpiry(slideId: string, force = false) {
    setExpiredQuizSlideIds((prev) => {
      if (prev.has(slideId)) return prev;
      return new Set(prev).add(slideId);
    });
    if (scoredSlideIds.has(slideId)) return;
    setScoredSlideIds((prev) => new Set(prev).add(slideId));
    try {
      await scoreActiveQuizSlide(presentation.id, slideId, { force });
      await loadParticipants();
      if (autoAdvance) armAutoAdvance(slideId);
    } catch (err) {
      console.error("scoreActiveQuizSlide failed", err);
      setScoredSlideIds((prev) => {
        const next = new Set(prev);
        next.delete(slideId);
        return next;
      });
    }
  }

  // Arm the timed leaderboard → next sequence. Stage 1 shows the leaderboard
  // after a beat; stage 2 counts down then advances. Stored timer ids are
  // cleared by any manual nav or slide change so it can never fire late.
  function armAutoAdvance(slideId: string) {
    clearAutoTimers();
    const LEADERBOARD_DELAY_MS = 3000;
    const NEXT_SECONDS = 6;
    autoTimersRef.current.push(
      setTimeout(() => {
        setLeaderboardSlideId(slideId);
        let n = NEXT_SECONDS;
        setAutoCountdown(n);
        const iv = setInterval(() => {
          n -= 1;
          if (n <= 0) {
            clearInterval(iv);
            setAutoCountdown(null);
            void navigateRef.current("next");
          } else {
            setAutoCountdown(n);
          }
        }, 1000);
        autoTimersRef.current.push(iv);
      }, LEADERBOARD_DELAY_MS),
    );
  }

  async function endQuizQuestionNow(slideId: string) {
    clearAutoTimers();
    await scoreQuizOnExpiry(slideId, true);
  }

  // Confirmation is handled inline by EndSessionButton — NOT window.confirm,
  // which browsers silently suppress after a few dialogs. Same reason we
  // don't alert() on failure.
  async function endSessionNow() {
    clearAutoTimers();
    setNavError(null);
    // Optimistic local update so the UI flips even if the realtime
    // event takes a moment (or doesn't fire at all).
    setPresentation((p) => ({ ...p, state: "closed" }));
    try {
      await endPresentation(presentation.id);
    } catch (err) {
      console.error("endPresentation failed", err);
      setPresentation((p) => ({ ...p, state: "active" }));
      setNavError(err instanceof Error ? err.message : "Couldn't end the session. Check your connection and try again.");
    }
  }

  function goToNextSlide() {
    void navigate("next");
  }

  function goToPrevSlide() {
    clearAutoTimers();
    if (showQuizLeaderboard) {
      setLeaderboardSlideId(null);
      return;
    }
    void navigate("prev");
  }

  const visibleCount = responses.filter((r) => (r.status ?? "approved") !== "rejected").length;

  return (
    <ThemedShell theme={themeForShell}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <JoinCorner displayJoinUrl={displayJoinUrl} code={presentation.code} joinUrl={joinUrl} />
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl px-2 py-3 sm:px-6 sm:py-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="mono text-[11px] uppercase tracking-[0.2em] muted-text">
              Slide {String(idx + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")} · {currentSlide.type}
              {isKahoot && <span className="ml-2" style={{ color: "var(--blue)" }}>· Game show</span>}
            </div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] muted-text">
              <a
                href={`/api/export/${presentation.id}/csv`}
                download
                className="hover:text-[var(--fg)]"
                title="Download responses as CSV"
              >
                ⬇ CSV
              </a>
              <PresenterMusicToggle />
              <button
                type="button"
                onClick={toggleAutoAdvance}
                title={autoAdvance ? "Auto-advance on — questions flow automatically" : "Auto-advance off — you control each step"}
                aria-label={autoAdvance ? "Turn off auto-advance" : "Turn on auto-advance"}
                aria-pressed={autoAdvance}
                className="flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors"
                style={{
                  background: autoAdvance ? "rgba(0,113,227,0.12)" : "transparent",
                  border: "1px solid var(--line)",
                  color: autoAdvance ? "var(--blue)" : "var(--muted)",
                }}
              >
                <FastForward className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-[0.14em]">Auto</span>
              </button>
              <ModeToggleButton mode={effectiveMode} onToggle={toggleMode} />
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                title="Keyboard shortcuts (?)"
                aria-label="Show keyboard shortcuts"
                className="hover:text-[var(--fg)]"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="hover:text-[var(--fg)]"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <SessionStatusPill state="live" />
            </div>
          </div>
          <div key={`${currentSlide.id}-${showQuizLeaderboard ? "leaderboard" : "slide"}`} className="slide-enter flex min-h-0 flex-1 flex-col">
            {showQuizLeaderboard ? (
              <QuizLeaderboardScreen
                participants={participants}
                baseline={roundBaseline}
                quizSlideIds={quizSlides.slice(0, Math.max(0, quizNumber)).map((s) => s.id)}
                supabase={supabase}
              />
            ) : isKahoot ? (
              <KahootPresenterView
                slide={currentSlide}
                responses={responses}
                startedAt={presentation.current_slide_started_at}
                onExpired={() => scoreQuizOnExpiry(currentSlide.id)}
                forceClosed={quizExpired}
                questionNumber={quizNumber}
                questionCount={quizSlides.length}
                playerCount={participants.length}
                nicknames={nicknames}
              />
            ) : (
              <>
                <h2 className="display-l mt-1 break-words">
                  {currentSlide.question || <span className="muted-text">(no question)</span>}
                </h2>

                {currentSlide.image_url && (
                  <div className="anim-fade-up mt-6" style={{ animationDelay: "0.15s" }}>
                    <img
                      src={currentSlide.image_url}
                      alt=""
                      className="max-h-72 w-full object-contain rounded-xl"
                      style={{ border: "1px solid var(--line)" }}
                    />
                    {currentSlide.image_credit && (
                      <p className="mt-1 text-[10px] muted-text">
                        Photo by{" "}
                        <a href={currentSlide.image_credit.photographer_url} target="_blank" rel="noopener noreferrer">
                          {currentSlide.image_credit.photographer}
                        </a>{" "}
                        on{" "}
                        <a href="https://unsplash.com/?utm_source=klikr&utm_medium=referral" target="_blank" rel="noopener noreferrer">
                          Unsplash
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {qaCfg && (qaCfg.moderation === "pre" || qaCfg.moderation === "post") && (
                  <QAModerationTray responses={responses} qaCfg={qaCfg} />
                )}

                <div className="anim-fade-up mt-6 flex min-h-0 flex-1 flex-col" style={{ animationDelay: "0.25s" }}>
                  {currentSlide.type === "mcq" && (
                    <ResultsBarChart slide={currentSlide} responses={responses} fill />
                  )}
                  {currentSlide.type === "wordcloud" && <WordCloudView responses={responses} />}
                  {currentSlide.type === "open" && <OpenResponses responses={responses} />}
                  {currentSlide.type === "quiz" && (
                    <QuizCountdown
                      slide={currentSlide}
                      responses={responses}
                      startedAt={presentation.current_slide_started_at}
                      onExpired={() => scoreQuizOnExpiry(currentSlide.id)}
                      forceClosed={quizExpired}
                    />
                  )}
                  {currentSlide.type === "qa" && (
                    <QAStream slide={currentSlide} responses={responses} />
                  )}
                  {currentSlide.type === "rating" && (
                    <RatingDistribution slide={currentSlide} responses={responses} />
                  )}
                  {currentSlide.type === "ranking" && (
                    <ResultsRanking slide={currentSlide} responses={responses} />
                  )}
                  {currentSlide.type === "embed" && (
                    <EmbedSlide config={currentSlide.config as EmbedConfig} />
                  )}
                </div>

                <div className="mt-4 text-xs muted-text">
                  <span key={visibleCount} className="mono count-bump text-[var(--fg)]">
                    {visibleCount}
                  </span>{" "}
                  responses
                </div>
              </>
            )}
          </div>
        </div>

        {navError && (
          <p className="px-2 text-xs sm:px-6" style={{ color: "var(--danger, #fca5a5)" }} role="alert">
            {navError}
          </p>
        )}
        <div className="flex items-center justify-between px-2 sm:px-6">
          <button
            onClick={goToPrevSlide}
            disabled={idx === 0 && !showQuizLeaderboard}
            className="btn-ghost disabled:opacity-40"
          >
            ← Prev
          </button>
          {autoCountdown !== null && (
            <button
              onClick={clearAutoTimers}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{ background: "rgba(0,113,227,0.12)", border: "1px solid rgba(0,113,227,0.35)", color: "var(--blue)" }}
              title="Cancel auto-advance"
            >
              <FastForward className="h-4 w-4" />
              Auto ▸ next in {autoCountdown}s · tap to cancel
            </button>
          )}
          {isQuiz && !showQuizLeaderboard ? (
            <div className="flex items-center gap-2">
              {!quizExpired && (
                <button
                  onClick={() => endQuizQuestionNow(currentSlide.id)}
                  className="btn-ghost"
                  style={{ color: "var(--danger)", borderColor: "rgba(252,165,165,.3)" }}
                >
                  End question
                </button>
              )}
              {quizExpired ? (
                <>
                  <button
                    onClick={() => {
                      clearAutoTimers();
                      playPresenterClip("whoosh");
                      setLeaderboardSlideId(currentSlide.id);
                    }}
                    className="btn-ghost"
                  >
                    Show leaderboard
                  </button>
                  {isLast ? (
                    <EndSessionButton onConfirm={endSessionNow} variant="primary" />
                  ) : (
                    <button
                      onClick={goToNextSlide}
                      className="btn-primary"
                    >
                      Next question →
                    </button>
                  )}
                </>
              ) : (
                <button disabled className="btn-primary opacity-40">
                  Waiting for timer
                </button>
              )}
            </div>
          ) : isLast ? (
            <EndSessionButton onConfirm={endSessionNow} variant="ghost" />
          ) : (
            <button
              onClick={goToNextSlide}
              className="btn-primary"
            >
              Next →
            </button>
          )}
        </div>

        {hasAnyQuiz && !isQuiz && <Leaderboard participants={participants} />}

        <ReactionOverlay presentationId={presentation.id} />
      </div>
      <PresenterShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </ThemedShell>
  );
}

// Join code + QR in the corner. Memoized: it never changes during a session,
// so answers streaming in don't re-render it.
const JoinCorner = memo(function JoinCorner({
  displayJoinUrl,
  code,
  joinUrl,
}: {
  displayJoinUrl: string;
  code: string;
  joinUrl: string;
}) {
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="text-right leading-tight">
        <div className="text-[10px] uppercase tracking-[0.18em] muted-text">Join at</div>
        <div className="mono text-sm">{displayJoinUrl}</div>
        <div className="mono text-2xl font-semibold tracking-[0.22em]">{code}</div>
      </div>
      <QrCode value={joinUrl} size={88} />
    </div>
  );
});

// Between-question scoreboard. Two beats: rows first sit where they were
// before this question, then spring to the new standings while the scores
// count up. Callouts: the biggest climber, and the hottest answer streak.
export function QuizLeaderboardScreen({
  participants,
  baseline,
  quizSlideIds,
  supabase,
}: {
  participants: Participant[];
  baseline: RoundBaseline | null;
  quizSlideIds: string[];
  supabase: ReturnType<typeof createClient>;
}) {
  const ranked = useMemo(
    () => sortByScore(participants).map((p, i) => ({ id: p.id, nickname: p.nickname, score: p.score, rank: i + 1 })),
    [participants],
  );
  const top = useMemo(() => ranked.slice(0, 8), [ranked]);
  const prev = useMemo(() => (baseline ? [...baseline.values()] : null), [baseline]);
  const rows = useStagedRows(top, prev, 800);

  const climber = useMemo(() => {
    if (!baseline) return null;
    let best: { nickname: string; delta: number } | null = null;
    for (const r of ranked) {
      const b = baseline.get(r.id);
      if (!b) continue;
      const delta = b.rank - r.rank;
      if (delta >= 2 && (!best || delta > best.delta)) best = { nickname: r.nickname, delta };
    }
    return best;
  }, [ranked, baseline]);

  // Answer streaks from quiz_slide_scores (owner-readable): consecutive
  // correct answers ending with the question just played.
  const [streak, setStreak] = useState<{ nickname: string; n: number } | null>(null);
  const idsKey = quizSlideIds.join(",");
  useEffect(() => {
    if (quizSlideIds.length < 2) return;
    let cancelled = false;
    supabase
      .from("quiz_slide_scores")
      .select("participant_id, slide_id")
      .in("slide_id", quizSlideIds)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const got = new Map<string, Set<string>>();
        for (const row of data as { participant_id: string; slide_id: string }[]) {
          if (!got.has(row.participant_id)) got.set(row.participant_id, new Set());
          got.get(row.participant_id)!.add(row.slide_id);
        }
        let best: { id: string; n: number } | null = null;
        for (const [pid, set] of got) {
          let n = 0;
          for (let i = quizSlideIds.length - 1; i >= 0 && set.has(quizSlideIds[i]); i--) n++;
          if (n >= 2 && (!best || n > best.n)) best = { id: pid, n };
        }
        const nick = best ? ranked.find((r) => r.id === best!.id)?.nickname : null;
        setStreak(best && nick ? { nickname: nick, n: best.n } : null);
      });
    return () => {
      cancelled = true;
    };
    // ranked is read for nicknames only; refetch per question, not per score tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, idsKey]);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-center text-[11px] uppercase tracking-[0.24em] muted-text">Leaderboard</p>
        <h2 className="lb-title mt-2 text-center text-4xl font-semibold tracking-tight sm:text-6xl">
          Current standings
        </h2>
        {(climber || streak) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {streak ? (
              <span className="callout-pill" style={{ animationDelay: "1.1s" }}>
                <Flame className="h-4 w-4" style={{ color: "#f97316" }} /> {streak.nickname} — {streak.n} in a row
              </span>
            ) : null}
            {climber ? (
              <span className="callout-pill" style={{ animationDelay: "1.35s" }}>
                <TrendingUp className="h-4 w-4" style={{ color: "#16a34a" }} /> {climber.nickname} climbed {climber.delta} places
              </span>
            ) : null}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="panel-soft mt-10 p-10 text-center">
            <p className="text-lg font-medium">No scores yet.</p>
            <p className="mt-2 text-sm muted-text">Scores appear after a quiz question is answered and timed out.</p>
          </div>
        ) : (
          <div className="mt-10">
            <LeaderboardRows rows={rows} variant="presenter" podium />
          </div>
        )}
      </div>
    </div>
  );
}

function QAModerationTray({ responses, qaCfg }: { responses: ResponseRow[]; qaCfg: QAConfig }) {
  // In `pre` mode the tray holds pending + flagged. In `post` mode it holds
  // only flagged (everything else is already on stage).
  const tray = responses.filter((r) => {
    const status = r.status ?? "approved";
    if (qaCfg.moderation === "pre") return status === "pending" || r.flagged;
    return r.flagged && status !== "rejected";
  });
  if (tray.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl p-3" style={{ border: "1px dashed var(--line-strong)", background: "rgba(255,255,255,0.03)" }}>
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] muted-text">
        <span>Moderation tray ({tray.length})</span>
        <span>only you see this</span>
      </div>
      <ul className="space-y-2">
        {tray.map((q) => (
          <li
            key={q.id}
            className="flex items-start gap-3 rounded-lg p-3"
            style={{
              border: "1px solid " + (q.flagged ? "rgba(252,165,165,0.5)" : "var(--line)"),
              background: q.flagged ? "rgba(252,165,165,0.06)" : "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex-1 text-sm leading-snug">
              {q.flagged && <span className="mono mr-2 text-[10px]" style={{ color: "var(--danger, #fca5a5)" }}>FLAG</span>}
              {q.value_text}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setQuestionStatus({ responseId: q.id, status: "approved" })}
                className="btn-ghost text-xs"
                style={{ color: "var(--blue)" }}
              >
                Approve
              </button>
              <button
                onClick={() => setQuestionStatus({ responseId: q.id, status: "rejected" })}
                className="btn-ghost text-xs"
                style={{ color: "var(--danger, #fca5a5)" }}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Single, direct "End session" — one click ends the game and moves everyone to
// the podium. No window.confirm (browsers suppress it after repeated dialogs)
// and no two-step (the second "End now" tap wasn't obvious and read as "the
// button doesn't work"). Styled destructive so the intent is clear.
function EndSessionButton({ onConfirm, variant }: { onConfirm: () => void; variant: "primary" | "ghost" }) {
  return (
    <button
      onClick={onConfirm}
      className={variant === "ghost" ? "btn-ghost" : "btn-primary"}
      style={
        variant === "ghost"
          ? { color: "var(--danger)", borderColor: "rgba(252,165,165,.3)" }
          : { background: "var(--danger)", borderColor: "var(--danger)" }
      }
    >
      End session
    </button>
  );
}

function ModeToggleButton({
  mode,
  onToggle,
}: {
  mode: "light" | "dark";
  onToggle: () => void;
}) {
  const Icon = mode === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={onToggle}
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
      style={{
        background: "transparent",
        border: "1px solid var(--line)",
        color: "var(--muted)",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ThemedShell({ theme, children }: { theme: Presentation["theme"]; children: React.ReactNode }) {
  // Mode (light/dark) is now driven globally by data-theme on <html>, so this
  // shell only handles the saved accent color and an optional brand logo.
  const accent = theme?.accent_color;
  const style: React.CSSProperties = {};
  if (accent) {
    (style as Record<string, string>)["--accent"] = accent;
    (style as Record<string, string>)["--blue"] = accent;
    (style as Record<string, string>)["--blue-hover"] = accent;
  }
  return (
    <div style={style} className="flex flex-1 flex-col">
      {theme?.logo_url && (
        <img src={theme.logo_url} alt="" className="mb-4 h-8 w-auto object-contain" />
      )}
      {children}
    </div>
  );
}

const LOBBY_MILESTONES = [10, 25, 50, 100, 200] as const;

function Lobby({
  presentation,
  participants,
  slidesCount,
  joinUrl,
  mode,
  onToggleMode,
  onStart,
  starting,
  startError,
}: {
  presentation: Presentation;
  participants: Participant[];
  slidesCount: number;
  joinUrl: string;
  mode: "light" | "dark";
  onToggleMode: () => void;
  onStart: () => void;
  starting: boolean;
  startError: string | null;
}) {
  const code = presentation.code;
  let joinHost = "klikrapp.com";
  try {
    joinHost = new URL(joinUrl).host.replace(/^www\./, "");
  } catch {}

  // Detect newly-joined participants and push them as toast pop-ups. The first
  // render seeds the "seen" set so we don't toast people who were already in
  // the room when the host arrived.
  const seenRef = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<{ id: string; nickname: string; key: number }[]>([]);
  const [latestId, setLatestId] = useState<string | null>(null);

  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(participants.map((p) => p.id));
      return;
    }
    const seen = seenRef.current;
    const fresh = participants.filter((p) => !seen.has(p.id));
    if (fresh.length === 0) return;
    fresh.forEach((p) => seen.add(p.id));
    // A big batch is the initial roster load (people already in the room),
    // not a wave of live joins — don't toast every one of them.
    if (fresh.length > 5) return;
    setLatestId(fresh[fresh.length - 1].id);
    setToasts((prev) => [
      ...prev,
      ...fresh.map((p) => ({ id: p.id, nickname: p.nickname, key: Date.now() + Math.random() })),
    ]);
  }, [participants]);

  // Auto-dismiss each toast after ~3.2s. Cap the stack so a rush of joins
  // doesn't bury the screen.
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0];
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.key !== oldest.key));
    }, toasts.length > 4 ? 600 : 3200);
    return () => clearTimeout(t);
  }, [toasts]);

  // Room milestones: a celebratory beat at 10 / 25 / 50 / 100 players. Only
  // for live joins — not when the roster first loads with people already in.
  const [milestone, setMilestone] = useState<number | null>(null);
  const prevCountRef = useRef(0);
  useEffect(() => {
    const n = participants.length;
    const prevN = prevCountRef.current;
    prevCountRef.current = n;
    const reached = (count: number) => [...LOBBY_MILESTONES].reverse().find((m) => count >= m) ?? 0;
    const hit = reached(n);
    if (hit > reached(prevN) && n - prevN <= 3) {
      setMilestone(hit);
      playPresenterClip("correct");
      const t = setTimeout(() => setMilestone(null), 2600);
      return () => clearTimeout(t);
    }
  }, [participants.length]);

  return (
    <div className="relative panel p-6 text-center overflow-hidden sm:p-14">
      <div className="orb orb-1 float-slow" style={{ opacity: 0.3 }} />
      <div className="orb orb-2 float-slow" style={{ opacity: 0.22 }} />

      {/* Join toasts — stack at the top, newest on top, auto-dismiss after 3.2s. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.key}
            className="join-toast flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg"
            style={{
              background: "var(--blue)",
              color: "#fff",
              boxShadow: "0 12px 28px -12px rgba(0,113,227,0.55)",
            }}
          >
            <span aria-hidden>👋</span>
            <span className="truncate max-w-[260px]">
              <span className="font-semibold">{t.nickname}</span>{" "}
              <span style={{ opacity: 0.85 }}>joined</span>
            </span>
          </div>
        ))}
      </div>

      {milestone ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" aria-live="polite">
          <div key={milestone} className="milestone-burst relative rounded-3xl px-10 py-6 text-center text-white">
            <MiniConfettiBurst count={30} />
            <p className="text-6xl font-extrabold tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>{milestone}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.24em] opacity-90">players in the room!</p>
          </div>
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <ModeToggleButton mode={mode} onToggle={onToggleMode} />
        <PresenterMusicToggle />
      </div>

      <div className="anim-fade-up pill"><span className="live-dot pulse-ring" /> Lobby</div>
      <p className="anim-fade-up delay-200 mt-6 text-sm muted-text">Audience joins at</p>
      <p className="anim-fade-up delay-200 mt-1 text-base break-all">
        <span className="muted-text">{joinHost} / </span>
        <span className="mono">{code}</span>
      </p>

      <div className="relative z-10 mt-10 flex flex-col items-center justify-center gap-6 sm:mt-12">
        <div className="qr-halo float-slow">
          <QrCode value={joinUrl} size={360} />
        </div>
        <p className="text-xs uppercase tracking-[0.18em] muted-text">Scan to join</p>
        <p
          className="mono text-5xl font-bold sm:text-7xl"
          style={{
            letterSpacing: "0.22em",
            color: "var(--blue)",
          }}
          aria-label={code}
        >
          {code}
        </p>
      </div>

      <div className="relative z-10 mt-12 sm:mt-14">
        <p className="text-xs uppercase tracking-[0.18em] muted-text">
          In the room
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight" style={{ color: "var(--blue)" }}>
          <span key={participants.length} className="count-bump inline-block">
            {participants.length}
          </span>{" "}
          <span className="text-base font-medium muted-text">
            {participants.length === 1 ? "person joined" : "people joined"}
          </span>
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {participants.map((p, i) => {
            const isLatest = p.id === latestId;
            return (
              <li
                key={p.id}
                className={`${isLatest ? "chip-bounce name-glow" : "row-enter"} rounded-full px-3 py-1.5 text-sm font-medium`}
                style={{
                  background: isLatest ? "rgba(0, 113, 227, .22)" : "rgba(0, 113, 227, .14)",
                  border: "1px solid rgba(0, 113, 227, .35)",
                  color: "var(--blue)",
                  animationDelay: isLatest ? "0ms" : `${Math.min(i, 12) * 50}ms`,
                }}
              >
                {p.nickname}
              </li>
            );
          })}
          {participants.length === 0 && (
            <li className="text-xs muted-text">No one yet.</li>
          )}
        </ul>
      </div>

      <button
        onClick={onStart}
        disabled={slidesCount === 0 || starting}
        className={`btn-primary mt-12 px-10 py-3 text-base ${
          slidesCount > 0 && participants.length > 0 && !starting ? "start-pulse" : ""
        }`}
      >
        {slidesCount === 0 ? "Add slides first" : starting ? "Starting…" : "Start"}
      </button>
      {startError && (
        <p className="anim-fade-up relative z-10 mt-3 text-xs" style={{ color: "var(--danger, #fca5a5)" }} role="alert">
          {startError}
        </p>
      )}
    </div>
  );
}
