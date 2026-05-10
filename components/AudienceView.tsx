"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, MCQConfig, QuizConfig, WordCloudConfig, QAConfig, RatingConfig, RankingConfig, ResponseRow } from "@/lib/types";
import { joinSession, submitResponse, sendReaction, toggleQuestionVote, submitQuestion, getParticipantScores } from "@/app/play/[code]/actions";
import { KahootAudienceView } from "./KahootAudienceView";
import { AudienceFinalResults } from "./AudienceFinalResults";
import { LogoMarkPlayer } from "./remotion/LogoMarkPlayer";
import { TakeoverProvider, useTakeover } from "./audience/TakeoverContext";
import { TakeoverLayer } from "./audience/TakeoverLayer";

type LocalParticipant = {
  id: string;
  nickname: string;
  presentationId: string;
  participantToken: string;
};

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
        const stored = JSON.parse(raw) as Partial<LocalParticipant>;
        if (stored.id && stored.nickname && stored.participantToken) {
          setParticipant(stored as LocalParticipant);
        } else {
          localStorage.removeItem(STORAGE_KEY(presentation.id));
        }
      } catch {}
    }
    setLoaded(true);
  }, [presentation.id]);

  // Track realtime connectivity so we can show a reconnect pill when the
  // socket drops. SUBSCRIBED → connected, anything else → reconnecting.
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const channel = supabase
      .channel(`audience-${presentation.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "presentations", filter: `id=eq.${presentation.id}` },
        (payload) => setPresentation((prev) => ({ ...prev, ...(payload.new as Presentation) })),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });
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
            participantToken: p.participant_token,
          };
          localStorage.setItem(STORAGE_KEY(presentation.id), JSON.stringify(local));
          setParticipant(local);
        }}
      />
    );
  }

  if (presentation.state === "lobby") {
    return (
      <TakeoverProvider>
        <Stage>
          <div className="flex justify-center" aria-hidden>
            <LogoMarkPlayer variant="idle" width={260} height={80} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Hi {participant.nickname}!</h2>
          <p className="mt-2 text-slate-500">Waiting for the presenter to start…</p>
          <p className="mt-4 text-xs muted-text">Keep this tab open — answers will appear as the host moves on.</p>
        </Stage>
        <TakeoverLayer />
      </TakeoverProvider>
    );
  }

  if (presentation.state === "closed") {
    return (
      <TakeoverProvider>
        <AudienceFinalResults
          presentationId={presentation.id}
          participantId={participant.id}
          participantToken={participant.participantToken}
          nickname={participant.nickname}
          hasAnyQuiz={slides.some((s) => s.type === "quiz")}
        />
        <TakeoverLayer />
      </TakeoverProvider>
    );
  }

  const currentSlide = slides.find((s) => s.id === presentation.current_slide_id) ?? null;
  if (!currentSlide) {
    return (
      <TakeoverProvider>
        <Stage>
          <p className="text-slate-500">Up next…</p>
        </Stage>
        <TakeoverLayer />
      </TakeoverProvider>
    );
  }

  const slideStartedAt = presentation.current_slide_started_at
    ? new Date(presentation.current_slide_started_at).getTime()
    : null;

  return (
    <TakeoverProvider>
      <Stage>
        {!connected ? (
          <div
            className="anim-fade-up mb-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ background: "rgba(245,158,11,0.10)", color: "#b45309", border: "1px solid rgba(245,158,11,0.35)" }}
            role="status"
            aria-live="polite"
          >
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: 999, background: "#f59e0b", display: "inline-block" }}
              className="live-dot"
            />
            Reconnecting…
          </div>
        ) : null}
        <div key={currentSlide.id} className="slide-enter">
          <p className="text-[10px] uppercase tracking-[0.18em] muted-text">{currentSlide.type}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{currentSlide.question}</h2>
          {currentSlide.image_url ? (
            <div className="anim-fade-up mt-4">
              <img
                src={currentSlide.image_url}
                alt=""
                className="w-full max-h-56 object-cover rounded-xl"
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
          ) : null}
          <div className="mt-6">
            {currentSlide.type === "mcq" ? (
              <MCQ slide={currentSlide} participantId={participant.id} participantToken={participant.participantToken} />
            ) : null}
            {currentSlide.type === "quiz" ? (
              currentSlide.kahoot_mode ? (
                <KahootAudienceView
                  slide={currentSlide}
                  participantId={participant.id}
                  participantToken={participant.participantToken}
                  presentationId={presentation.id}
                  startedAt={slideStartedAt}
                />
              ) : (
                <Quiz
                  slide={currentSlide}
                  participantId={participant.id}
                  participantToken={participant.participantToken}
                  presentationId={presentation.id}
                  startedAt={slideStartedAt}
                />
              )
            ) : null}
            {currentSlide.type === "embed" ? (
              <p className="text-sm muted-text">Look at the host's screen — there's nothing to tap on this one.</p>
            ) : null}
            {currentSlide.type === "wordcloud" ? (
              <WordCloudInput
                slide={currentSlide}
                participantId={participant.id}
                participantToken={participant.participantToken}
              />
            ) : null}
            {currentSlide.type === "open" ? (
              <OpenInput slide={currentSlide} participantId={participant.id} participantToken={participant.participantToken} />
            ) : null}
            {currentSlide.type === "qa" ? (
              <QAInput
                slide={currentSlide}
                participantId={participant.id}
                participantToken={participant.participantToken}
                supabase={supabase}
              />
            ) : null}
            {currentSlide.type === "rating" ? (
              <RatingInput
                slide={currentSlide}
                participantId={participant.id}
                participantToken={participant.participantToken}
              />
            ) : null}
            {currentSlide.type === "ranking" ? (
              <RankingInput
                slide={currentSlide}
                participantId={participant.id}
                participantToken={participant.participantToken}
              />
            ) : null}
          </div>
        </div>
        <ReactionsBar
          presentationId={presentation.id}
          participantId={participant.id}
          participantToken={participant.participantToken}
        />
      </Stage>
      <TakeoverLayer />
    </TakeoverProvider>
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
      <h2 className="anim-fade-up text-xl font-semibold">Choose a nickname</h2>
      <form
        className="anim-fade-up delay-200 mt-4 space-y-3"
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

function MCQ({
  slide,
  participantId,
  participantToken,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
}) {
  const cfg = slide.config as MCQConfig;
  const multi = cfg.multi ?? false;
  const max = cfg.max_choices ?? cfg.options.length;
  const [picked, setPicked] = useState<number | null>(null);
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const { trigger } = useTakeover();

  if (multi) {
    const submit = async () => {
      if (picks.size === 0 || submitted) return;
      setSubmitted(true);
      const res = await submitResponse({
        slideId: slide.id,
        participantId,
        participantToken,
        valueText: JSON.stringify([...picks].sort((a, b) => a - b)),
      });
      if (res && "ordinal" in res && typeof res.ordinal === "number") {
        trigger({ kind: "submitted", ordinal: res.ordinal, total: res.total as number });
      }
    };
    return (
      <div className="space-y-2">
        {cfg.options.map((opt, i) => {
          const isOn = picks.has(i);
          const atCap = picks.size >= max && !isOn;
          return (
            <button
              key={i}
              type="button"
              disabled={submitted || atCap}
              onClick={() => {
                setPicks((prev) => {
                  const n = new Set(prev);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                });
              }}
              className="press anim-fade-up w-full rounded-xl px-4 py-4 text-left text-base transition-all"
              style={{
                animationDelay: `${i * 60}ms`,
                border: "1px solid " + (isOn ? "var(--blue)" : "var(--line)"),
                background: isOn ? "rgba(0,113,227,0.10)" : "rgba(255,255,255,0.02)",
                color: isOn ? "var(--blue)" : "var(--fg)",
                opacity: atCap ? 0.4 : 1,
              }}
            >
              <span className="mono mr-3 muted-text" style={{ fontSize: 12 }}>
                {isOn ? "✓" : String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
        <div className="flex items-center justify-between text-xs muted-text">
          <span className="mono">{picks.size}/{max}</span>
          <button
            disabled={submitted || picks.size === 0}
            onClick={submit}
            className="btn-primary press"
            style={{ height: 40 }}
          >
            {submitted ? "Submitted" : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cfg.options.map((opt, i) => (
        <button
          key={i}
          disabled={picked !== null}
          onClick={async () => {
            setPicked(i);
            const res = await submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: i });
            if (res && "ordinal" in res && typeof res.ordinal === "number") {
              trigger({ kind: "submitted", ordinal: res.ordinal, total: res.total as number });
            }
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

function RankingInput({
  slide,
  participantId,
  participantToken,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
}) {
  const cfg = slide.config as RankingConfig;
  const [order, setOrder] = useState<number[]>(() => cfg.items.map((_, i) => i));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trigger } = useTakeover();

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const submit = async () => {
    if (submitted) return;
    setError(null);
    try {
      setSubmitted(true);
      const res = await submitResponse({
        slideId: slide.id,
        participantId,
        participantToken,
        valueText: JSON.stringify(order),
      });
      if (res && "ordinal" in res && typeof res.ordinal === "number") {
        trigger({ kind: "submitted", ordinal: res.ordinal, total: res.total as number });
      }
    } catch (e) {
      setSubmitted(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs muted-text">Order from best (top) to worst (bottom).</p>
      <ul className="space-y-2">
        {order.map((idx, i) => (
          <li
            key={idx}
            className="anim-fade-up flex items-center gap-3 rounded-xl px-3 py-3"
            style={{
              animationDelay: `${i * 50}ms`,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span className="mono w-6 text-center text-sm muted-text" style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <span className="flex-1 text-base">{cfg.items[idx]}</span>
            <button
              type="button"
              disabled={i === 0 || submitted}
              onClick={() => move(i, -1)}
              className="press btn-ghost px-2 py-1 text-sm disabled:opacity-30"
              aria-label="Move up"
            >↑</button>
            <button
              type="button"
              disabled={i === order.length - 1 || submitted}
              onClick={() => move(i, 1)}
              className="press btn-ghost px-2 py-1 text-sm disabled:opacity-30"
              aria-label="Move down"
            >↓</button>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs" style={{ color: "var(--danger, #fca5a5)" }}>{error}</p>}
      <button
        disabled={submitted}
        onClick={submit}
        className="btn-primary press w-full"
        style={{ height: 48 }}
      >
        {submitted ? "Submitted" : "Submit ranking"}
      </button>
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
  participantToken,
  presentationId,
  startedAt,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
  presentationId: string;
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

  // Reset local state when host moves to a new slide (component instance may
  // be reused if other quiz slides follow).
  useEffect(() => {
    setPicked(null);
  }, [slide.id]);

  const { trigger } = useTakeover();
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

  // Pre-reveal: locked-in confirmation while waiting for the timer to expire.
  if (picked !== null && !expired) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="anim-pop flex items-center gap-2 text-base font-medium" style={{ color: "var(--blue)" }}>
          <CheckBadge /> Locked in — submitted in {(elapsedMs / 1000).toFixed(1)}s
        </div>
        <p className="mt-3 text-sm muted-text">Hold tight for the result.</p>
      </div>
    );
  }

  // Post-reveal: TakeoverLayer covers the screen via the effect above. We
  // render a tiny placeholder underneath so the slide-area isn't visually
  // empty while the host moves on.
  if (expired) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm muted-text">Reveal up — hold tight.</p>
      </div>
    );
  }

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
              participantToken,
              valueIndex: i,
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
    </div>
  );
}

function WordCloudInput({
  slide,
  participantId,
  participantToken,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
}) {
  const cfg = slide.config as WordCloudConfig;
  const max = cfg.max_words_per_participant ?? 3;
  const [words, setWords] = useState<string[]>([]);
  const [text, setText] = useState("");
  const { trigger } = useTakeover();
  const submit = async (next: string[]) => {
    setWords(next);
    await submitResponse({
      slideId: slide.id,
      participantId,
      participantToken,
      valueText: next.join(" "),
    });
    trigger({ kind: "toast", text: "🌪 Word in!" });
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

function OpenInput({
  slide,
  participantId,
  participantToken,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trigger } = useTakeover();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || sent) return;
        setError(null);
        setSent(true);
        try {
          const res = await submitResponse({ slideId: slide.id, participantId, participantToken, valueText: text.trim() });
          if (res && "ordinal" in res && typeof res.ordinal === "number") {
            trigger({ kind: "submitted", ordinal: res.ordinal, total: res.total as number });
          }
        } catch (err) {
          setSent(false);
          setError(err instanceof Error ? err.message : String(err));
        }
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
      {error && <p className="text-xs" style={{ color: "var(--danger, #fca5a5)" }}>{error}</p>}
      <button disabled={!text.trim() || sent} className="btn-primary press w-full" style={{ height: 48 }}>
        {sent ? "Sent" : "Submit"}
      </button>
    </form>
  );
}

// ----------------- Q&A with upvotes -----------------
function QAInput({
  slide,
  participantId,
  participantToken,
  supabase,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const cfg = slide.config as QAConfig;
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<ResponseRow[]>([]);
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map());
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pendingHint, setPendingHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trigger } = useTakeover();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: q } = await supabase
        .from("responses").select("*").eq("slide_id", slide.id)
        .order("created_at", { ascending: true });
      if (!cancelled && q) setQuestions(q as ResponseRow[]);
      const { data: votes } = await supabase
        .from("question_votes").select("response_id, participant_id")
        .in("response_id", (q ?? []).map((x) => x.id));
      if (!cancelled && votes) {
        const counts = new Map<string, number>();
        const mine = new Set<string>();
        for (const v of votes) {
          counts.set(v.response_id, (counts.get(v.response_id) ?? 0) + 1);
          if (v.participant_id === participantId) mine.add(v.response_id);
        }
        setVoteCounts(counts);
        setMyVotes(mine);
      }
    };
    load();
    const channel = supabase
      .channel(`qa-${slide.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `slide_id=eq.${slide.id}` },
        (p) => setQuestions((prev) => [...prev, p.new as ResponseRow]))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "question_votes" },
        () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [supabase, slide.id, participantId]);

  // Audience only ever sees approved questions; pending/rejected/flagged stay in the presenter tray.
  // Pinned items float to the top, then upvotes, then time.
  const sortedQs = [...questions]
    .filter((q) => (q.status ?? "approved") === "approved")
    .sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      const va = voteCounts.get(a.id) ?? 0;
      const vb = voteCounts.get(b.id) ?? 0;
      if (vb !== va) return vb - va;
      return a.created_at < b.created_at ? -1 : 1;
    });

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || busy) return;
          setBusy(true);
          setError(null);
          try {
            const result = await submitQuestion({ slideId: slide.id, participantId, participantToken, text: t });
            trigger({ kind: "toast", text: "🙋 Question in!" });
            setText("");
            setPendingHint(result.status === "pending" ? "Question sent — awaiting approval." : null);
            setTimeout(() => setPendingHint(null), 4000);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally { setBusy(false); }
        }}
        className="space-y-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder="Ask a question…"
          rows={3}
          className="input resize-none w-full"
          style={{ height: "auto", minHeight: 84, padding: "12px" }}
        />
        <button disabled={!text.trim() || busy} className="btn-primary press w-full" style={{ height: 44 }}>
          {busy ? "Sending…" : "Ask"}
        </button>
        {pendingHint && (
          <p className="anim-fade-in text-xs" style={{ color: "var(--blue)" }}>{pendingHint}</p>
        )}
        {error && (
          <p className="text-xs" style={{ color: "var(--danger, #fca5a5)" }}>{error}</p>
        )}
      </form>

      <div className="space-y-2">
        {sortedQs.length === 0 ? (
          <p className="text-center text-sm muted-text">Be the first to ask.</p>
        ) : sortedQs.map((q) => {
          const votes = voteCounts.get(q.id) ?? 0;
          const mine = myVotes.has(q.id);
          return (
            <div key={q.id} className="anim-fade-up flex gap-3 rounded-xl p-3" style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex-1 text-sm leading-snug">{q.value_text}</div>
              {(cfg.upvotes ?? true) && (
                <button
	                  type="button"
	                  onClick={async () => {
	                    setMyVotes((prev) => {
	                      const n = new Set(prev);
	                      if (n.has(q.id)) n.delete(q.id);
	                      else n.add(q.id);
	                      return n;
	                    });
	                    setVoteCounts((prev) => { const n = new Map(prev); n.set(q.id, (n.get(q.id) ?? 0) + (mine ? -1 : 1)); return n; });
	                    await toggleQuestionVote({ responseId: q.id, participantId, participantToken });
	                  }}
                  className="press flex flex-col items-center justify-center rounded-lg px-3 py-1 text-xs"
                  style={{
                    background: mine ? "rgba(0,113,227,0.12)" : "rgba(255,255,255,0.04)",
                    border: "1px solid " + (mine ? "rgba(0,113,227,0.4)" : "var(--line)"),
                    color: mine ? "var(--blue)" : "var(--fg)",
                    minWidth: 44,
                  }}
                  aria-label="Upvote"
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>▲</span>
                  <span className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>{votes}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------- Rating slide -----------------
function RatingInput({
  slide,
  participantId,
  participantToken,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
}) {
  const cfg = slide.config as RatingConfig;
  const [picked, setPicked] = useState<number | null>(null);
  const { trigger } = useTakeover();
  const range = cfg.scale === 5 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="space-y-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${range.length}, minmax(0, 1fr))` }}>
        {range.map((n, i) => (
          <button
            key={n}
            disabled={picked !== null}
            onClick={async () => {
              setPicked(n);
              const res = await submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: n });
              if (res && "ordinal" in res && typeof res.ordinal === "number") {
                trigger({ kind: "submitted", ordinal: res.ordinal, total: res.total as number });
              }
            }}
            className="press anim-fade-up rounded-lg text-base font-semibold transition-all"
            style={{
              animationDelay: `${i * 30}ms`,
              height: cfg.scale === 5 ? 56 : 44,
              border: "1px solid " + (picked === n ? "var(--blue)" : "var(--line)"),
              background: picked === n ? "rgba(0,113,227,0.10)" : "rgba(255,255,255,0.02)",
              color: picked === n ? "var(--blue)" : "var(--fg)",
              opacity: picked !== null && picked !== n ? 0.4 : 1,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs muted-text">
        <span>{cfg.min_label ?? (cfg.scale === 5 ? "Poor" : "Not at all")}</span>
        <span>{cfg.max_label ?? (cfg.scale === 5 ? "Great" : "Extremely")}</span>
      </div>
      {picked !== null && (
        <div className="anim-pop flex items-center justify-center gap-2 text-sm" style={{ color: "var(--blue)" }}>
          <CheckBadge /> Thanks for rating
        </div>
      )}
    </div>
  );
}

// ----------------- Reactions bar -----------------
const REACTION_EMOJI = ["👏", "❤️", "🎉", "😂", "🔥", "💡"];

function ReactionsBar({
  presentationId,
  participantId,
  participantToken,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
}) {
  const [pulses, setPulses] = useState<{ id: number; emoji: string }[]>([]);
  const send = (e: string) => {
    const id = Date.now() + Math.random();
    setPulses((p) => [...p, { id, emoji: e }]);
    setTimeout(() => setPulses((p) => p.filter((x) => x.id !== id)), 800);
    void sendReaction({ presentationId, participantId, participantToken, emoji: e });
  };
  return (
    <div className="relative mt-6">
      <div className="flex items-center justify-center gap-2 rounded-full panel p-2">
        {REACTION_EMOJI.map((e) => (
          <button
            key={e}
            onClick={() => send(e)}
            className="press rounded-full text-2xl transition-transform hover:scale-110"
            style={{ width: 40, height: 40 }}
            aria-label={`React ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10">
        {pulses.map((p) => (
          <span key={p.id} className="absolute left-1/2 top-1/2 text-3xl"
            style={{ animation: "rxFloat 0.8s ease-out forwards", transform: `translate(-50%, -50%)` }}>
            {p.emoji}
          </span>
        ))}
      </div>
      <style>{`@keyframes rxFloat { 0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; } 100% { transform: translate(-50%, -160%) scale(1.6); opacity: 0; } }`}</style>
    </div>
  );
}
