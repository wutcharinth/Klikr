"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, ResponseRow, Participant } from "@/lib/types";
import { startPresentation, moveSlide, endPresentation } from "@/app/present/[id]/actions";
import { setQuestionStatus } from "@/app/play/[code]/actions";
import { ResultsBarChart } from "./ResultsBarChart";
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
import type { EmbedConfig, QAConfig } from "@/lib/types";

export function PresenterView({
  presentation: initialPresentation,
  slides,
}: {
  presentation: Presentation;
  slides: Slide[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [presentation, setPresentation] = useState(initialPresentation);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const currentSlide = slides.find((s) => s.id === presentation.current_slide_id) ?? null;

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
          supabase
            .from("participants")
            .select("*")
            .eq("presentation_id", presentation.id)
            .order("score", { ascending: false })
            .then(({ data }) => data && setParticipants(data));
        },
      )
      .subscribe();
    supabase
      .from("participants")
      .select("*")
      .eq("presentation_id", presentation.id)
      .order("score", { ascending: false })
      .then(({ data }) => data && setParticipants(data));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, presentation.id]);

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

  if (presentation.state === "lobby") {
    return (
      <Lobby
        presentation={presentation}
        participants={participants}
        slidesCount={slides.length}
        onStart={() => startPresentation(presentation.id)}
      />
    );
  }

  const hadAnyKahoot = slides.some((s) => s.type === "quiz" && s.kahoot_mode);
  const hasAnyQuiz = slides.some((s) => s.type === "quiz");

  if (presentation.state === "closed") {
    return (
      <ThemedShell theme={presentation.theme}>
        <div className="flex flex-1 flex-col gap-6">
          <div className="panel p-12 text-center">
            <div className="pill"><span className="live-dot" /> Session complete</div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Thanks for playing.</h2>
            <a
              href={`/api/export/${presentation.id}/csv`}
              download
              className="btn-ghost mt-6 text-sm"
            >
              ⬇ Export CSV
            </a>
          </div>
          {hadAnyKahoot ? (
            <QuizPodium participants={participants} presentationId={presentation.id} />
          ) : hasAnyQuiz ? (
            <Leaderboard participants={participants} />
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
  const qaCfg = currentSlide.type === "qa" ? (currentSlide.config as QAConfig) : null;

  return (
    <ThemedShell theme={presentation.theme}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
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
              <span className="flex items-center gap-2"><span className="live-dot" /> live</span>
            </div>
          </div>
          <div key={currentSlide.id} className="slide-enter flex min-h-0 flex-1 flex-col">
            {isKahoot ? (
              <KahootPresenterView
                slide={currentSlide}
                responses={responses}
                startedAt={presentation.current_slide_started_at}
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
                    <ResultsBarChart slide={currentSlide} responses={responses} highlightCorrect fill />
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
                  <span className="mono text-[var(--fg)]">{responses.filter((r) => (r.status ?? "approved") !== "rejected").length}</span> responses
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-2 sm:px-6">
          <button
            onClick={() => moveSlide(presentation.id, "prev")}
            disabled={idx === 0}
            className="btn-ghost disabled:opacity-40"
          >
            ← Prev
          </button>
          {isLast ? (
            <button
              onClick={() => endPresentation(presentation.id)}
              className="btn-ghost"
              style={{ color: "var(--danger)", borderColor: "rgba(252,165,165,.3)" }}
            >
              End session
            </button>
          ) : (
            <button onClick={() => moveSlide(presentation.id, "next")} className="btn-primary">
              Next →
            </button>
          )}
        </div>

        {hasAnyQuiz && <Leaderboard participants={participants} />}

        <ReactionOverlay presentationId={presentation.id} />
      </div>
    </ThemedShell>
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

function ThemedShell({ theme, children }: { theme: Presentation["theme"]; children: React.ReactNode }) {
  const accent = theme?.accent_color;
  const dark = theme?.mode === "dark";
  const style: React.CSSProperties = {};
  if (accent) {
    (style as Record<string, string>)["--accent"] = accent;
    (style as Record<string, string>)["--blue"] = accent;
    (style as Record<string, string>)["--blue-hover"] = accent;
  }
  if (dark) {
    style.background = "var(--graphite-1)";
    style.color = "var(--white)";
  }
  return (
    <div style={style} className={"flex flex-1 flex-col " + (dark ? "scene-dark rounded-2xl p-1" : "")}>
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
  onStart,
}: {
  presentation: Presentation;
  participants: Participant[];
  slidesCount: number;
  onStart: () => void;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const joinUrl = origin ? `${origin}/play/${presentation.code}` : `/play/${presentation.code}`;
  const joinHost = origin ? new URL(origin).host : "klikr.app";

  return (
    <div className="relative panel p-6 text-center overflow-hidden sm:p-14">
      <div className="orb orb-1" style={{ opacity: 0.25 }} />
      <div className="orb orb-2" style={{ opacity: 0.18 }} />
      <div className="anim-fade-up pill"><span className="live-dot" /> Lobby</div>
      <p className="anim-fade-up delay-200 mt-6 text-sm muted-text">Audience joins at</p>
      <p className="anim-fade-up delay-200 mt-1 text-base break-all">
        <span className="muted-text">{joinHost} / </span>
        <span className="mono">{presentation.code}</span>
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-8 sm:mt-12 sm:flex-row sm:gap-10">
        <p
          className="anim-pop delay-300 mono text-6xl font-bold tracking-[0.18em] sm:text-8xl"
          style={{
            background: "linear-gradient(120deg, var(--fg) 30%, var(--blue) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {presentation.code}
        </p>
        <div className="anim-pop delay-300 flex flex-col items-center gap-3">
          <QrCode value={joinUrl} size={280} />
          <p className="text-xs uppercase tracking-[0.18em] muted-text">Scan to join</p>
        </div>
      </div>

      <div className="mt-12 sm:mt-14">
        <p className="text-[10px] uppercase tracking-[0.18em] muted-text">
          Joined · {participants.length}
        </p>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {participants.map((p, i) => (
            <li
              key={p.id}
              className="anim-pop rounded-full px-3 py-1 text-sm"
              style={{
                background: "rgba(0, 113, 227, .10)",
                border: "1px solid rgba(0, 113, 227, .25)",
                color: "var(--blue)",
                animationDelay: `${i * 80}ms`,
              }}
            >
              {p.nickname}
            </li>
          ))}
          {participants.length === 0 && (
            <li className="text-xs muted-text">No one yet.</li>
          )}
        </ul>
      </div>

      <button
        onClick={onStart}
        disabled={slidesCount === 0}
        className="btn-primary mt-12 px-10 py-3 text-base"
      >
        {slidesCount === 0 ? "Add slides first" : "Start"}
      </button>
    </div>
  );
}
