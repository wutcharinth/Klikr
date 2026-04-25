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
      <p className="text-[10px] uppercase tracking-[0.18em] muted-text">{currentSlide.type}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{currentSlide.question}</h2>

      {currentSlide.image_url && (
        <img
          src={currentSlide.image_url}
          alt=""
          className="mt-4 w-full max-h-56 object-cover rounded-xl"
          style={{ border: "1px solid var(--line)" }}
        />
      )}

      <div className="mt-6">
        {currentSlide.type === "mcq" && (
          <MCQ slide={currentSlide} participantId={participant.id} />
        )}
        {currentSlide.type === "quiz" && (
          <Quiz slide={currentSlide} participantId={participant.id} startedAt={slideStartedAt} />
        )}
        {currentSlide.type === "wordcloud" && (
          <WordCloudInput slide={currentSlide} participantId={participant.id} />
        )}
        {currentSlide.type === "open" && (
          <OpenInput slide={currentSlide} participantId={participant.id} />
        )}
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
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-lg text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="Your nickname"
          required
        />
        <button
          disabled={busy}
          className="w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Join
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
            "w-full rounded-md border px-4 py-3 text-left text-base " +
            (picked === i
              ? "border-brand-600 bg-brand-100 text-brand-700"
              : "border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800")
          }
        >
          {opt}
        </button>
      ))}
      {picked !== null && <p className="text-sm text-slate-500">Answer locked in.</p>}
    </div>
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

  return (
    <div className="space-y-2">
      <p className="text-right font-mono text-sm text-slate-500">
        {Math.ceil(remainingMs / 1000)}s
      </p>
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
          className={
            "w-full rounded-md border px-4 py-3 text-left text-base " +
            (picked === i
              ? "border-brand-600 bg-brand-100 text-brand-700"
              : "border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800")
          }
        >
          {opt}
        </button>
      ))}
      {expired && picked === null && <p className="text-sm text-red-600">Time's up.</p>}
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
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-brand-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          disabled={!text.trim() || words.length >= max}
          className="rounded-md bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <ul className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <li
            key={i}
            className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
          >
            {w}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        {words.length}/{max} submitted
      </p>
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
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-brand-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        placeholder="Your response…"
      />
      <button
        disabled={!text.trim() || sent}
        className="w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {sent ? "Sent" : "Submit"}
      </button>
    </form>
  );
}
