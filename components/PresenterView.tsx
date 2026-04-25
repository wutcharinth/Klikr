"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, ResponseRow, Participant } from "@/lib/types";
import { startPresentation, moveSlide, endPresentation } from "@/app/present/[id]/actions";
import { ResultsBarChart } from "./ResultsBarChart";
import { WordCloudView } from "./WordCloudView";
import { OpenResponses } from "./OpenResponses";
import { Leaderboard } from "./Leaderboard";

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

  if (presentation.state === "closed") {
    return (
      <div className="space-y-6">
        <div className="panel p-12 text-center">
          <div className="pill"><span className="live-dot" /> Session complete</div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">Thanks for playing.</h2>
        </div>
        <Leaderboard participants={participants} />
      </div>
    );
  }

  if (!currentSlide) {
    return <p className="muted-text text-sm">No slides.</p>;
  }

  const idx = slides.findIndex((s) => s.id === currentSlide.id);
  const isLast = idx === slides.length - 1;

  return (
    <div className="space-y-5">
      <div className="panel p-8">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] uppercase tracking-[0.18em] muted-text">
            Slide {String(idx + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")} · {currentSlide.type}
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] muted-text">
            <span className="live-dot" /> live
          </div>
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          {currentSlide.question || <span className="muted-text">(no question)</span>}
        </h2>

        <div className="mt-8">
          {currentSlide.type === "mcq" && (
            <ResultsBarChart slide={currentSlide} responses={responses} />
          )}
          {currentSlide.type === "wordcloud" && <WordCloudView responses={responses} />}
          {currentSlide.type === "open" && <OpenResponses responses={responses} />}
          {currentSlide.type === "quiz" && (
            <ResultsBarChart slide={currentSlide} responses={responses} highlightCorrect />
          )}
        </div>

        <div className="mt-5 text-xs muted-text">
          <span className="mono text-[var(--fg)]">{responses.length}</span> responses
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

      {slides.some((s) => s.type === "quiz") && <Leaderboard participants={participants} />}
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
    <div className="panel p-14 text-center">
      <div className="pill"><span className="live-dot" /> Lobby</div>
      <p className="mt-6 text-sm muted-text">Audience joins at</p>
      <p className="mt-1 text-base">
        <span className="muted-text">{typeof window !== "undefined" ? window.location.host : "klikr.app"} / </span>
        <span className="mono">{presentation.code}</span>
      </p>

      <p className="mono mt-14 text-7xl font-bold tracking-[0.15em]">
        {presentation.code}
      </p>

      <div className="mt-14">
        <p className="text-[10px] uppercase tracking-[0.18em] muted-text">
          Joined · {participants.length}
        </p>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="rounded-full px-3 py-1 text-sm"
              style={{ background: "rgba(124,138,255,.10)", border: "1px solid rgba(124,138,255,.25)" }}
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
