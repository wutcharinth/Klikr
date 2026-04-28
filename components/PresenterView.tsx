"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { QrCode } from "./QrCode";
import { PresenterMusicToggle } from "./PresenterMusicToggle";
import { SessionStatusPill } from "./SessionStatusPill";
import { PresenterShortcutsHelp } from "./PresenterShortcutsHelp";
import { Keyboard, Maximize2, Minimize2 } from "lucide-react";
import type { EmbedConfig, QAConfig } from "@/lib/types";

export function PresenterView({
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
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [modeOverride, setModeOverride] = useState<"light" | "dark" | null>(null);
  const [scoredSlideIds, setScoredSlideIds] = useState<Set<string>>(() => new Set());
  const [expiredQuizSlideIds, setExpiredQuizSlideIds] = useState<Set<string>>(() => new Set());
  const [leaderboardSlideId, setLeaderboardSlideId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  // Keyboard shortcuts — host-only, scoped to presentation states.
  // Right / Space → next, Left → prev, F → fullscreen.
  // Ignore when focus is in an input / textarea / contenteditable so editing
  // isn't disrupted.
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
          moveSlide(presentation.id, "next").catch(() => {});
        }
      } else if (e.key === "ArrowLeft") {
        if (presentation.state === "active") {
          e.preventDefault();
          moveSlide(presentation.id, "prev").catch(() => {});
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
  }, [presentation.state, presentation.id, toggleFullscreen]);

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

  const currentSlide = slides.find((s) => s.id === presentation.current_slide_id) ?? null;

  const loadParticipants = useCallback(() => {
    return supabase
      .from("participants")
      .select("*")
      .eq("presentation_id", presentation.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setParticipants(data);
      });
  }, [supabase, presentation.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`pres-${presentation.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "presentations", filter: `id=eq.${presentation.id}` },
        (payload) => setPresentation((prev) => ({ ...prev, ...(payload.new as Presentation) })),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `presentation_id=eq.${presentation.id}` },
        () => {
          loadParticipants();
        },
      )
      .subscribe();
    loadParticipants();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, presentation.id, loadParticipants]);

  useEffect(() => {
    setLeaderboardSlideId(null);
  }, [currentSlide?.id]);

  useEffect(() => {
    if (!currentSlide) {
      setResponses([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("responses")
      .select("*")
      .eq("slide_id", currentSlide.id)
      .then(({ data }) => {
        if (!cancelled && data) setResponses(data);
      });
    const channel = supabase
      .channel(`slide-${currentSlide.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `slide_id=eq.${currentSlide.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setResponses((r) => [...r, payload.new as ResponseRow]);
          } else if (payload.eventType === "UPDATE") {
            setResponses((r) =>
              r.map((x) => (x.id === (payload.new as ResponseRow).id ? (payload.new as ResponseRow) : x)),
            );
          } else if (payload.eventType === "DELETE") {
            setResponses((r) => r.filter((x) => x.id !== (payload.old as ResponseRow).id));
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, currentSlide]);

  const themeForShell: Presentation["theme"] = {
    ...(presentation.theme ?? {}),
    mode: effectiveMode,
  };

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
          onStart={() => startPresentation(presentation.id)}
        />
      </ThemedShell>
    );
  }

  const hasAnyQuiz = slides.some((s) => s.type === "quiz");

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
          <div className="panel p-12 text-center">
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
    } catch (err) {
      console.error("scoreActiveQuizSlide failed", err);
      setScoredSlideIds((prev) => {
        const next = new Set(prev);
        next.delete(slideId);
        return next;
      });
    }
  }

  async function endQuizQuestionNow(slideId: string) {
    await scoreQuizOnExpiry(slideId, true);
  }

  async function endSessionNow() {
    if (!confirm("End the session for everyone?")) return;
    // Optimistic local update so the UI flips even if the realtime
    // event takes a moment (or doesn't fire at all).
    setPresentation((p) => ({ ...p, state: "closed" }));
    try {
      await endPresentation(presentation.id);
    } catch (err) {
      console.error("endPresentation failed", err);
      alert("Could not end the session. Try again.");
      setPresentation((p) => ({ ...p, state: "active" }));
    }
  }

  function goToNextSlide() {
    setLeaderboardSlideId(null);
    moveSlide(presentation.id, "next");
  }

  return (
    <ThemedShell theme={themeForShell}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-end gap-3">
          <div className="text-right leading-tight">
            <div className="text-[10px] uppercase tracking-[0.18em] muted-text">Join at</div>
            <div className="mono text-sm">{displayJoinUrl}</div>
            <div className="mono text-2xl font-semibold tracking-[0.22em]">{presentation.code}</div>
          </div>
          <QrCode value={joinUrl} size={88} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl px-2 py-3 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="mono text-[11px] uppercase tracking-[0.2em] muted-text">
              Slide {String(idx + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")} · {currentSlide.type}
              {isKahoot && <span className="ml-2" style={{ color: "var(--blue)" }}>· Kahoot mode</span>}
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
              <QuizLeaderboardScreen participants={participants} />
            ) : isKahoot ? (
              <KahootPresenterView
                slide={currentSlide}
                responses={responses}
                startedAt={presentation.current_slide_started_at}
                onExpired={() => scoreQuizOnExpiry(currentSlide.id)}
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
                  {(() => {
                    const visibleCount = responses.filter(
                      (r) => (r.status ?? "approved") !== "rejected",
                    ).length;
                    return (
                      <>
                        <span
                          key={visibleCount}
                          className="mono count-bump text-[var(--fg)]"
                        >
                          {visibleCount}
                        </span>{" "}
                        responses
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-2 sm:px-6">
          <button
            onClick={() => {
              if (showQuizLeaderboard) {
                setLeaderboardSlideId(null);
                return;
              }
              moveSlide(presentation.id, "prev");
            }}
            disabled={idx === 0 && !showQuizLeaderboard}
            className="btn-ghost disabled:opacity-40"
          >
            ← Prev
          </button>
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
                    onClick={() => setLeaderboardSlideId(currentSlide.id)}
                    className="btn-ghost"
                  >
                    Show leaderboard
                  </button>
                  {isLast ? (
                    <button
                      onClick={endSessionNow}
                      className="btn-primary"
                    >
                      End session
                    </button>
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
            <button
              onClick={endSessionNow}
              className="btn-ghost"
              style={{ color: "var(--danger)", borderColor: "rgba(252,165,165,.3)" }}
            >
              End session
            </button>
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

function QuizLeaderboardScreen({ participants }: { participants: Participant[] }) {
  const sorted = [...participants]
    .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-center text-[11px] uppercase tracking-[0.24em] muted-text">
          Leaderboard
        </p>
        <h2 className="mt-2 text-center text-4xl font-semibold tracking-tight sm:text-6xl">
          Current standings
        </h2>
        {sorted.length === 0 ? (
          <div className="panel-soft mt-10 p-10 text-center">
            <p className="text-lg font-medium">No scores yet.</p>
            <p className="mt-2 text-sm muted-text">Scores appear after a quiz question is answered and timed out.</p>
          </div>
        ) : (
          <ol className="mt-10 space-y-3">
            {sorted.map((p, i) => {
              const rank = i + 1;
              return (
                <li
                  key={p.id}
                  className="row-enter flex items-center gap-4 rounded-2xl px-5 py-4 text-lg sm:px-6 sm:py-5"
                  style={{
                    animationDelay: `${i * 70}ms`,
                    background: rank === 1 ? "rgba(0, 113, 227, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    border: "1px solid " + (rank === 1 ? "rgba(0, 113, 227, 0.35)" : "var(--line)"),
                  }}
                >
                  <span
                    className="mono flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
                    style={{
                      background: rank === 1 ? "var(--blue)" : "var(--line)",
                      color: rank === 1 ? "#fff" : "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.nickname}</span>
                  <span className="mono text-2xl font-bold" style={{ fontVariantNumeric: "tabular-nums", color: "var(--blue)" }}>
                    {p.score.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ol>
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

function Lobby({
  presentation,
  participants,
  slidesCount,
  joinUrl,
  mode,
  onToggleMode,
  onStart,
}: {
  presentation: Presentation;
  participants: Participant[];
  slidesCount: number;
  joinUrl: string;
  mode: "light" | "dark";
  onToggleMode: () => void;
  onStart: () => void;
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
    setLatestId(fresh[fresh.length - 1].id);
    setToasts((prev) => [
      ...prev,
      ...fresh.map((p) => ({ id: p.id, nickname: p.nickname, key: Date.now() + Math.random() })),
    ]);
  }, [participants]);

  // Auto-dismiss each toast after ~3.2s.
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0];
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.key !== oldest.key));
    }, 3200);
    return () => clearTimeout(t);
  }, [toasts]);

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
                className={`${isLatest ? "anim-pop" : "row-enter"} rounded-full px-3 py-1.5 text-sm font-medium`}
                style={{
                  background: isLatest ? "rgba(0, 113, 227, .22)" : "rgba(0, 113, 227, .14)",
                  border: "1px solid rgba(0, 113, 227, .35)",
                  color: "var(--blue)",
                  animationDelay: isLatest ? "0ms" : `${Math.min(i, 12) * 60}ms`,
                  boxShadow: isLatest ? "0 0 0 4px rgba(0,113,227,0.18)" : undefined,
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
        disabled={slidesCount === 0}
        className={`btn-primary mt-12 px-10 py-3 text-base ${
          slidesCount > 0 && participants.length > 0 ? "start-pulse" : ""
        }`}
      >
        {slidesCount === 0 ? "Add slides first" : "Start"}
      </button>
    </div>
  );
}
