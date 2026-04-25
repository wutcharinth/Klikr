"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, MCQConfig, QuizConfig, WordCloudConfig } from "@/lib/types";
import { joinSession, submitResponse } from "@/app/play/[code]/actions";

type LocalParticipant = { id: string; nickname: string; presentationId: string };

const STORAGE_KEY = (presentationId: string) => `klikr:participant:${presentationId}`;

export function AudienceView({
  presentation: initial,
  slides,
}: {
  presentation: Presentation;
  slides: Slide[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [presentation, setPresentation] = useState(initial);
  const [participant, setParticipant] = useState<LocalParticipant | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY(presentation.id));
    if (raw) {
      try {
        setParticipant(JSON.parse(raw));
      } catch {}
    }
    setLoaded(true);
  }, [presentation.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`audience-${presentation.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "presentations", filter: `id=eq.${presentation.id}` },
        (payload) => setPresentation((prev) => ({ ...prev, ...(payload.new as Presentation) })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, presentation.id]);

  if (!loaded) return null;

  if (!participant) {
    return (
      <NicknameForm
        onJoin={async (nickname) => {
          const p = await joinSession(presentation.id, nickname);
          const local: LocalParticipant = {
            id: p.id,
            nickname: p.nickname,
            presentationId: presentation.id,
          };
          localStorage.setItem(STORAGE_KEY(presentation.id), JSON.stringify(local));
          setParticipant(local);
        }}
      />
    );
  }

  if (presentation.state === "lobby") {
    return (
      <Stage>
        <h2 className="text-2xl font-semibold">Hi {participant.nickname}!</h2>
        <p className="mt-2 text-slate-500">Waiting for the presenter to start…</p>
      </Stage>
    );
  }

  if (presentation.state === "closed") {
    return (
      <Stage>
        <h2 className="text-2xl font-semibold">Session ended</h2>
        <p className="mt-2 text-slate-500">Thanks for playing!</p>
      </Stage>
    );
  }

  const currentSlide = slides.find((s) => s.id === presentation.current_slide_id) ?? null;
  if (!currentSlide) {
    return (
      <Stage>
        <p className="text-slate-500">Up next…</p>
      </Stage>
    );
  }

  const slideStartedAt = presentation.current_slide_started_at
    ? new Date(presentation.current_slide_started_at).getTime()
    : null;

  return (
    <Stage>
      <div key={currentSlide.id} className="slide-enter">
        <p className="text-[10px] uppercase tracking-[0.18em] muted-text">{currentSlide.type}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{currentSlide.question}</h2>
        {currentSlide.image_url ? (
          <img
            src={currentSlide.image_url}
            alt=""
            className="anim-fade-up mt-4 w-full max-h-56 object-cover rounded-xl"
            style={{ border: "1px solid var(--line)" }}
          />
        ) : null}
        <div className="mt-6">
          {currentSlide.type === "mcq" ? (
            <MCQ slide={currentSlide} participantId={participant.id} />
          ) : null}
          {currentSlide.type === "quiz" ? (
            <Quiz slide={currentSlide} participantId={participant.id} startedAt={slideStartedAt} />
          ) : null}
          {currentSlide.type === "wordcloud" ? (
            <WordCloudInput slide={currentSlide} participantId={participant.id} />
          ) : null}
          {currentSlide.type === "open" ? (
            <OpenInput slide={currentSlide} participantId={participant.id} />
          ) : null}
        </div>
      </div>
    </Stage>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blue)" }}>Klikr</h1>
      <div className="panel p-6">{children}</div>
    </main>
  );
}

function NicknameForm({ onJoin }: { onJoin: (n: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Stage>
      <h2 className="text-xl font-semibold">Choose a nickname</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          try {
            await onJoin(name);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          autoFocus
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          style={{ height: 52, fontSize: 17 }}
          placeholder="Your nickname"
          required
        />
        <button disabled={busy} className="btn-primary press w-full" style={{ height: 48 }}>
          {busy ? "Joining…" : "Join"}
        </button>
      </form>
    </Stage>
  );
}

function MCQ({ slide, participantId }: { slide: Slide; participantId: string }) {
  const cfg = slide.config as MCQConfig;
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {cfg.options.map((opt, i) => (
        <button
          key={i}
          disabled={picked !== null}
          onClick={async () => {
            setPicked(i);
            await submitResponse({ slideId: slide.id, participantId, valueIndex: i });
          }}
          className={
            "press anim-fade-up w-full rounded-xl px-4 py-4 text-left text-base transition-all duration-200 "
          }
          style={{
            animationDelay: `${i * 60}ms`,
            border: "1px solid var(--line)",
            background: picked === i ? "rgba(0, 113, 227, 0.10)" : "rgba(255, 255, 255, 0.02)",
            borderColor: picked === i ? "var(--blue)" : "var(--line)",
            color: picked === i ? "var(--blue)" : "var(--fg)",
            opacity: picked !== null && picked !== i ? 0.4 : 1,
          }}
        >
          <span className="mono mr-3 muted-text" style={{ fontSize: 12 }}>
            {String.fromCharCode(65 + i)}
          </span>
          {opt}
        </button>
      ))}
      {picked !== null && (
        <div className="anim-pop mt-4 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--blue)" }}>
          <CheckBadge /> Answer locked in
        </div>
      )}
    </div>
  );
}

function CheckBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" opacity="0.15" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function Quiz({
  slide,
  participantId,
  startedAt,
}: {
  slide: Slide;
  participantId: string;
  startedAt: number | null;
}) {
  const cfg = slide.config as QuizConfig;
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const elapsedMs = startedAt ? now - startedAt : 0;
  const remainingMs = Math.max(0, cfg.time_limit_s * 1000 - elapsedMs);
  const expired = remainingMs <= 0;

  const pct = (remainingMs / (cfg.time_limit_s * 1000)) * 100;
  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-end gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
          <div
            className="absolute inset-y-0 left-0 transition-all"
            style={{
              width: `${pct}%`,
              background: pct < 30 ? "var(--danger, #fca5a5)" : "var(--blue)",
              transition: "width 250ms linear, background 300ms ease",
            }}
          />
        </div>
        <span className="mono text-sm muted-text" style={{ fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right" }}>
          {Math.ceil(remainingMs / 1000)}s
        </span>
      </div>
      {cfg.options.map((opt, i) => (
        <button
          key={i}
          disabled={picked !== null || expired}
          onClick={async () => {
            setPicked(i);
            await submitResponse({
              slideId: slide.id,
              participantId,
              valueIndex: i,
              responseMs: elapsedMs,
            });
          }}
          className="press anim-fade-up w-full rounded-xl px-4 py-4 text-left text-base transition-all duration-200"
          style={{
            animationDelay: `${i * 60}ms`,
            border: "1px solid var(--line)",
            background: picked === i ? "rgba(0, 113, 227, 0.10)" : "rgba(255, 255, 255, 0.02)",
            borderColor: picked === i ? "var(--blue)" : "var(--line)",
            color: picked === i ? "var(--blue)" : "var(--fg)",
            opacity: (picked !== null && picked !== i) || expired ? 0.45 : 1,
          }}
        >
          <span className="mono mr-3 muted-text" style={{ fontSize: 12 }}>
            {String.fromCharCode(65 + i)}
          </span>
          {opt}
        </button>
      ))}
      {picked !== null && (
        <div className="anim-pop mt-4 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--blue)" }}>
          <CheckBadge /> Submitted in {(elapsedMs / 1000).toFixed(1)}s
        </div>
      )}
      {expired && picked === null && (
        <p className="anim-fade-in mt-3 text-center text-sm" style={{ color: "var(--danger, #fca5a5)" }}>Time's up.</p>
      )}
    </div>
  );
}

function WordCloudInput({ slide, participantId }: { slide: Slide; participantId: string }) {
  const cfg = slide.config as WordCloudConfig;
  const max = cfg.max_words_per_participant ?? 3;
  const [words, setWords] = useState<string[]>([]);
  const [text, setText] = useState("");
  const submit = async (next: string[]) => {
    setWords(next);
    await submitResponse({
      slideId: slide.id,
      participantId,
      valueText: next.join(" "),
    });
  };
  return (
    <div className="space-y-3">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const w = text.trim();
          if (!w || words.length >= max) return;
          setText("");
          await submit([...words, w]);
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a word…"
          maxLength={32}
          disabled={words.length >= max}
          className="input flex-1"
        />
        <button disabled={!text.trim() || words.length >= max} className="btn-primary press">
          Add
        </button>
      </form>
      <ul className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <li
            key={`${i}-${w}`}
            className="anim-pop rounded-full px-3 py-1.5 text-sm"
            style={{
              background: "rgba(0, 113, 227, 0.10)",
              border: "1px solid rgba(0, 113, 227, 0.3)",
              color: "var(--blue)",
              animationDelay: `${i * 70}ms`,
            }}
          >
            {w}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 text-xs muted-text">
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${(words.length / max) * 100}%`, background: "var(--blue)", transitionDuration: "400ms" }}
          />
        </div>
        <span className="mono">{words.length}/{max}</span>
      </div>
    </div>
  );
}

function OpenInput({ slide, participantId }: { slide: Slide; participantId: string }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || sent) return;
        setSent(true);
        await submitResponse({ slideId: slide.id, participantId, valueText: text.trim() });
      }}
      className="space-y-3"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={500}
        disabled={sent}
        className="input resize-none w-full"
        style={{ height: "auto", minHeight: 120, padding: "12px" }}
        placeholder="Your response…"
      />
      <button disabled={!text.trim() || sent} className="btn-primary press w-full" style={{ height: 48 }}>
        {sent ? "Sent" : "Submit"}
      </button>
    </form>
  );
}
