"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Presentation, Slide, MCQConfig, WordCloudConfig, QAConfig, RatingConfig, RankingConfig, ResponseRow } from "@/lib/types";
import { joinSession, submitResponse, toggleQuestionVote, submitQuestion } from "@/app/play/[code]/actions";
import { KahootAudienceView, LockedIn, PhoneIntro } from "./KahootAudienceView";
import { TimeBar, TimeLeftPill } from "./QuizTimers";
import { AudienceFinalResults } from "./AudienceFinalResults";
import { TakeoverProvider, TakeoverSlideWatcher, useTakeover } from "./audience/TakeoverContext";
import { TakeoverLayer } from "./audience/TakeoverLayer";
import { StagedLeaderboard } from "./audience/AudienceLeaderboard";
import { StandingsProvider, useStandingsOptional } from "./audience/StandingsContext";
import { useQuizRound } from "./audience/useQuizRound";
import { reactionChannelName, REACTION_EVENT, REACTION_EMOJI } from "@/lib/realtime";
import { isMissingRpc } from "@/lib/supabase/rpc";
import { isAudioOn, setAudioOn } from "@/lib/audio";
import { useCountUp } from "@/lib/useCountUp";
import { Volume2, VolumeX } from "lucide-react";

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

  const hasQuiz = slides.some((s) => s.type === "quiz");
  const scoredRev = presentation.scored_rev ?? 0;
  // One shared standings fetcher for the whole session (score pill, quiz
  // reveal, leaderboard, final screen) — see StandingsContext.
  const withStandings = (children: React.ReactNode, top = 5) => (
    <StandingsProvider
      presentationId={presentation.id}
      participantId={participant.id}
      participantToken={participant.participantToken}
      scoredRev={scoredRev}
      slideId={presentation.current_slide_id}
      top={top}
      enabled={hasQuiz}
    >
      {children}
    </StandingsProvider>
  );

  if (presentation.state === "lobby") {
    return (
      <TakeoverProvider>
        <Stage>
          <div className="flex justify-center" aria-hidden>
            <LobbyMark />
          </div>
          <h2 className="anim-fade-up mt-4 text-2xl font-semibold">Hi {participant.nickname}!</h2>
          <p className="anim-fade-up delay-200 mt-2 text-slate-500">
            Waiting for the presenter to start<span className="loading-dots" aria-hidden />
          </p>
          <p className="mt-4 text-xs muted-text">Keep this tab open — answers will appear as the host moves on.</p>
        </Stage>
        <TakeoverLayer />
      </TakeoverProvider>
    );
  }

  if (presentation.state === "closed") {
    return withStandings(
      <TakeoverProvider>
        <AudienceFinalResults nickname={participant.nickname} hasAnyQuiz={hasQuiz} />
        <TakeoverLayer />
      </TakeoverProvider>,
      10,
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

  const quizIndex = currentSlide.type === "quiz" ? slides.filter((s) => s.type === "quiz").findIndex((s) => s.id === currentSlide.id) : -1;
  const quizCount = hasQuiz ? slides.filter((s) => s.type === "quiz").length : 0;

  return withStandings(
    <TakeoverProvider>
      <TakeoverSlideWatcher slideId={presentation.current_slide_id} />
      <Stage>
        {hasQuiz ? <MyScorePill /> : null}
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
          <p className="text-[10px] uppercase tracking-[0.18em] muted-text">
            {currentSlide.type === "quiz" && quizIndex >= 0
              ? `Question ${quizIndex + 1} of ${quizCount}`
              : currentSlide.type}
          </p>
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
                  startedAt={presentation.current_slide_started_at}
                />
              ) : (
                <Quiz
                  slide={currentSlide}
                  participantId={participant.id}
                  participantToken={participant.participantToken}
                  presentationId={presentation.id}
                  startedAt={presentation.current_slide_started_at}
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
        <ReactionsBar presentationId={presentation.id} supabase={supabase} />
      </Stage>
      <TakeoverLayer />
    </TakeoverProvider>,
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

// Lightweight CSS stand-in for the Remotion logo animation in the lobby — the
// Remotion runtime was ~100 KB of JS on the page every player loads first.
function LobbyMark() {
  return (
    <div className="lobby-mark" role="img" aria-label="Klikr">
      <span className="lobby-mark-word">Klikr</span>
      <span className="lobby-mark-dot" />
    </div>
  );
}

// Always-on personal score for the player's phone — visible across every slide
// of a quiz deck. Reads the shared standings (one fetch per scored_rev change,
// see StandingsContext) instead of polling on its own.
function MyScorePill() {
  const standings = useStandingsOptional();
  const me = standings?.standing?.me ?? null;
  const total = standings?.standing?.total ?? 0;
  const shown = useCountUp(me?.score ?? 0, { duration: 900 });
  if (!me) return null;
  return (
    <div
      className="anim-fade-up sticky top-2 z-10 mb-4 flex items-center justify-between gap-3 rounded-full px-4 py-2 text-white shadow-sm"
      style={{ background: "linear-gradient(135deg, var(--blue), #7C5CFF)" }}
      aria-live="polite"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-90">Your score</span>
      <span className="flex items-baseline gap-2">
        <span className="text-lg font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
          {shown.toLocaleString()}
        </span>
        {total > 1 ? (
          <span key={me.rank} className="anim-pop text-[11px] font-medium opacity-90">
            #{me.rank}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function NicknameForm({ onJoin }: { onJoin: (n: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [audio, setAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setAudio(isAudioOn()); }, []);
  return (
    <Stage>
      <div className="anim-fade-up flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Choose a nickname</h2>
        <button
          type="button"
          className="rounded-full p-2 muted-text hover:opacity-80"
          aria-label={audio ? "Mute sounds" : "Enable sounds"}
          onClick={() => { const next = !audio; setAudioOn(next); setAudio(next); }}
        >
          {audio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
      <form
        className="anim-fade-up delay-200 mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          setError(null);
          try {
            await onJoin(name);
          } catch (err) {
            // Without this, a failed join (closed session, dropped network,
            // transient server error) just reset the button back to "Join"
            // with zero explanation — indistinguishable from the app being
            // broken. Keep the typed name so the player doesn't retype it.
            setError(err instanceof Error ? err.message : "Couldn't join. Check your connection and try again.");
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
        {error && (
          <p className="text-xs" style={{ color: "var(--danger, #fca5a5)" }} role="alert">
            {error}
          </p>
        )}
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

// Classic (list-style) timed quiz on the phone. Same round mechanics as the
// game-show tiles (useQuizRound): get-ready intro, tap, locked in, reveal.
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
  startedAt: string | null;
}) {
  const { cfg, limit, timing, picked, choose, submitError } = useQuizRound({
    slide,
    participantId,
    participantToken,
    presentationId,
    startedAt,
  });

  if (timing.phase === "closed") return <StagedLeaderboard />;
  if (timing.phase === "intro") return <PhoneIntro openAt={timing.openAt} introMs={timing.introMs} />;
  if (picked !== null) {
    return (
      <LockedIn tileIndex={picked} text={cfg.options[picked]} closeAt={timing.closeAt} limit={limit} showTile={false} />
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1">
          <TimeBar closeAt={timing.closeAt} limit={limit} />
        </div>
        <TimeLeftPill closeAt={timing.closeAt} />
      </div>
      {cfg.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => choose(i)}
          className="press anim-fade-up w-full rounded-xl px-4 py-4 text-left text-base transition-all duration-200"
          style={{
            animationDelay: `${i * 60}ms`,
            border: "1px solid var(--line)",
            background: "rgba(255, 255, 255, 0.02)",
            color: "var(--fg)",
          }}
        >
          <span className="mono mr-3 muted-text" style={{ fontSize: 12 }}>
            {String.fromCharCode(65 + i)}
          </span>
          {opt}
        </button>
      ))}
      {submitError ? (
        <p className="text-center text-xs" style={{ color: "var(--danger, #ef4444)" }} role="alert">
          {submitError}
        </p>
      ) : null}
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

  // Questions stream in via a slide-filtered channel. Vote totals come from
  // the get_qa_votes RPC (aggregated in SQL), refreshed at most every 750ms —
  // previously any vote anywhere on the platform made every phone re-download
  // every vote row.
  const questionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    questionIdsRef.current = new Set(questions.map((q) => q.id));
  }, [questions]);

  useEffect(() => {
    let cancelled = false;
    let voteTimer: ReturnType<typeof setTimeout> | null = null;
    let votePending = false;

    const applyVotes = (rows: { response_id: string; votes: number; mine: boolean }[]) => {
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      for (const r of rows) {
        counts.set(r.response_id, r.votes);
        if (r.mine) mine.add(r.response_id);
      }
      setVoteCounts(counts);
      setMyVotes(mine);
    };

    const loadVotes = async () => {
      const { data, error } = await supabase.rpc("get_qa_votes", {
        p_slide_id: slide.id,
        p_participant_id: participantId,
      });
      if (cancelled) return;
      if (!error && data) {
        applyVotes(data as { response_id: string; votes: number; mine: boolean }[]);
        return;
      }
      if (!isMissingRpc(error)) return;
      // Fallback until migration 0027 is applied.
      const ids = [...questionIdsRef.current];
      if (ids.length === 0) return applyVotes([]);
      const { data: votes } = await supabase
        .from("question_votes")
        .select("response_id, participant_id")
        .in("response_id", ids);
      if (cancelled || !votes) return;
      const agg = new Map<string, { response_id: string; votes: number; mine: boolean }>();
      for (const v of votes) {
        const row = agg.get(v.response_id) ?? { response_id: v.response_id, votes: 0, mine: false };
        row.votes += 1;
        if (v.participant_id === participantId) row.mine = true;
        agg.set(v.response_id, row);
      }
      applyVotes([...agg.values()]);
    };

    const scheduleVotes = () => {
      if (voteTimer) {
        votePending = true;
        return;
      }
      void loadVotes();
      voteTimer = setTimeout(() => {
        voteTimer = null;
        if (votePending) {
          votePending = false;
          scheduleVotes();
        }
      }, 750);
    };

    (async () => {
      const { data: q } = await supabase
        .from("responses")
        .select("id, slide_id, participant_id, value_text, value_index, response_ms, created_at, status, pinned, flagged")
        .eq("slide_id", slide.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (q) {
        questionIdsRef.current = new Set(q.map((x) => x.id as string));
        setQuestions(q as ResponseRow[]);
      }
      scheduleVotes();
    })();

    const channel = supabase
      .channel(`qa-${slide.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `slide_id=eq.${slide.id}` },
        (p) => {
          const row = p.new as ResponseRow;
          setQuestions((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
        })
      .on("postgres_changes",
        // Moderation approvals / pins land as UPDATEs — previously ignored, so
        // a pre-moderated question never appeared on phones until reload.
        { event: "UPDATE", schema: "public", table: "responses", filter: `slide_id=eq.${slide.id}` },
        (p) => {
          const row = p.new as ResponseRow;
          setQuestions((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...row } : x)));
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "question_votes" },
        (p) => {
          // question_votes can't be filtered by slide server-side; skip events
          // for questions that aren't on this slide (DELETE payloads may only
          // carry the primary key, so those always refresh — throttled).
          const rid =
            (p.new as { response_id?: string } | null)?.response_id ??
            (p.old as { response_id?: string } | null)?.response_id;
          if (rid && !questionIdsRef.current.has(rid)) return;
          scheduleVotes();
        })
      .subscribe();
    return () => {
      cancelled = true;
      if (voteTimer) clearTimeout(voteTimer);
      supabase.removeChannel(channel);
    };
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
const REACTION_THROTTLE_MS = 250;

// Taps fly over Realtime Broadcast (no DB write). Each phone sends at most one
// reaction per 250ms; extra taps still pulse locally so it feels responsive.
function ReactionsBar({
  presentationId,
  supabase,
}: {
  presentationId: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const [pulses, setPulses] = useState<{ id: number; emoji: string }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    const ch = supabase.channel(reactionChannelName(presentationId), {
      config: { broadcast: { self: false, ack: false } },
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [supabase, presentationId]);

  const send = (e: string) => {
    const id = Date.now() + Math.random();
    setPulses((p) => [...p.slice(-6), { id, emoji: e }]);
    setTimeout(() => setPulses((p) => p.filter((x) => x.id !== id)), 800);
    const now = Date.now();
    if (now - lastSentRef.current < REACTION_THROTTLE_MS) return;
    lastSentRef.current = now;
    void channelRef.current?.send({ type: "broadcast", event: REACTION_EVENT, payload: { e } });
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
          <span key={p.id} className="rx-float absolute left-1/2 top-1/2 text-3xl">
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
