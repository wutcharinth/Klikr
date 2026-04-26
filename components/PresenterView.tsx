"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, ResponseRow, Participant } from "@/lib/types";
import { startPresentation, moveSlide, endPresentation } from "@/app/present/[id]/actions";
import { ResultsBarChart } from "./ResultsBarChart";
import { WordCloudView } from "./WordCloudView";
import { OpenResponses } from "./OpenResponses";
import { Leaderboard } from "./Leaderboard";
import { QAStream } from "./QAStream";
import { RatingDistribution } from "./RatingDistribution";
import { ReactionOverlay } from "./ReactionOverlay";
import { EmbedSlide } from "./EmbedSlide";
import { KahootPresenterView } from "./KahootPresenterView";
import { QuizPodium } from "./QuizPodium";
import type { EmbedConfig } from "@/lib/types";

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
        <div className="space-y-6">
          <div className="panel p-12 text-center">
            <div className="pill"><span className="live-dot" /> Session complete</div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Thanks for playing.</h2>
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

  return (
    <ThemedShell theme={presentation.theme}>
    <div className="space-y-5">
      <div className="panel p-8">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] uppercase tracking-[0.18em] muted-text">
            Slide {String(idx + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")} · {currentSlide.type}
            {isKahoot && <span className="ml-2" style={{ color: "var(--blue)" }}>· Kahoot mode</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] muted-text">
            <span className="live-dot" /> live
          </div>
        </div>
        <div key={currentSlide.id} className="slide-enter">
          {isKahoot ? (
            <KahootPresenterView
              slide={currentSlide}
              responses={responses}
              startedAt={presentation.current_slide_started_at}
            />
          ) : (
            <>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">
                {currentSlide.question || <span className="muted-text">(no question)</span>}
              </h2>

              {currentSlide.image_url && (
                <img
                  src={currentSlide.image_url}
                  alt=""
                  className="anim-fade-up mt-6 max-h-80 w-full object-contain rounded-xl"
                  style={{ border: "1px solid var(--line)", animationDelay: "0.15s" }}
                />
              )}

              <div className="anim-fade-up mt-8" style={{ animationDelay: "0.25s" }}>
                {currentSlide.type === "mcq" && (
                  <ResultsBarChart slide={currentSlide} responses={responses} />
                )}
                {currentSlide.type === "wordcloud" && <WordCloudView responses={responses} />}
                {currentSlide.type === "open" && <OpenResponses responses={responses} />}
                {currentSlide.type === "quiz" && (
                  <ResultsBarChart slide={currentSlide} responses={responses} highlightCorrect />
                )}
                {currentSlide.type === "qa" && (
                  <QAStream slide={currentSlide} responses={responses} />
                )}
                {currentSlide.type === "rating" && (
                  <RatingDistribution slide={currentSlide} responses={responses} />
                )}
                {currentSlide.type === "embed" && (
                  <EmbedSlide config={currentSlide.config as EmbedConfig} />
                )}
              </div>

              <div className="mt-5 text-xs muted-text">
                <span className="mono text-[var(--fg)]">{responses.length}</span> responses
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
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
    <div style={style} className={dark ? "scene-dark rounded-2xl p-1" : ""}>
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
  return (
    <div className="relative panel p-14 text-center overflow-hidden">
      <div className="orb orb-1" style={{ opacity: 0.25 }} />
      <div className="orb orb-2" style={{ opacity: 0.18 }} />
      <div className="anim-fade-up pill"><span className="live-dot" /> Lobby</div>
      <p className="anim-fade-up delay-200 mt-6 text-sm muted-text">Audience joins at</p>
      <p className="anim-fade-up delay-200 mt-1 text-base">
        <span className="muted-text">{typeof window !== "undefined" ? window.location.host : "klikr.app"} / </span>
        <span className="mono">{presentation.code}</span>
      </p>

      <p className="anim-pop delay-300 mono mt-14 text-8xl font-bold tracking-[0.18em]"
         style={{ background: "linear-gradient(120deg, var(--fg) 30%, var(--blue) 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
        {presentation.code}
      </p>

      <div className="mt-14">
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
