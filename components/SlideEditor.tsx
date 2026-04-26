"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { Slide, MCQConfig, QuizConfig, WordCloudConfig, QAConfig, RatingConfig, EmbedConfig, RankingConfig, ImageCredit } from "@/lib/types";
import { updateSlide, deleteSlide } from "@/app/edit/[id]/actions";
import { UnsplashPicker } from "./UnsplashPicker";
import { AI_ENABLED } from "@/lib/featureFlags";

export function SlideEditor({
  slide,
  index,
  presentationId,
}: {
  slide: Slide;
  index: number;
  presentationId: string;
}) {
  const [question, setQuestion] = useState(slide.question);
  const [config, setConfig] = useState(slide.config);
  const [imageUrl, setImageUrl] = useState<string | null>(slide.image_url);
  const [imageCredit, setImageCredit] = useState<ImageCredit | null>(slide.image_credit ?? null);
  const [kahoot, setKahoot] = useState<boolean>(slide.kahoot_mode ?? false);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = (override?: {
    image_url?: string | null;
    image_credit?: ImageCredit | null;
    kahoot_mode?: boolean;
    config?: typeof config;
  }) => {
    startTransition(async () => {
      await updateSlide(slide.id, presentationId, {
        question,
        config: override?.config ?? config,
        image_url: override?.image_url !== undefined ? override.image_url : imageUrl,
        image_credit:
          override?.image_credit !== undefined ? override.image_credit : imageCredit,
        kahoot_mode: override?.kahoot_mode ?? kahoot,
      });
      setSavedAt(Date.now());
    });
  };

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImageUrl(dataUrl);
      setImageCredit(null);
      save({ image_url: dataUrl, image_credit: null });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="mono text-[10px] uppercase tracking-[0.18em] muted-text">
          #{String(index + 1).padStart(2, "0")} · {labelFor(slide.type)}
        </h3>
        <form
          action={async () => {
            await deleteSlide(slide.id, presentationId);
          }}
        >
          <button className="text-xs muted-text hover:text-[var(--danger)]">Delete</button>
        </form>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs muted-text">Question</span>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onBlur={() => save()}
          placeholder="Type your question…"
          className="input"
        />
      </label>

      <div className="mt-4">
        <span className="mb-2 block text-xs muted-text">Image (optional)</span>
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt=""
              className="w-full max-h-64 object-cover rounded-xl"
              style={{ border: "1px solid var(--line)" }}
            />
            {imageCredit && (
              <p className="mt-1 text-[10px] muted-text">
                Photo by{" "}
                <a
                  href={imageCredit.photographer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--blue-link)" }}
                >
                  {imageCredit.photographer}
                </a>{" "}
                on{" "}
                <a
                  href="https://unsplash.com/?utm_source=klikr&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--blue-link)" }}
                >
                  Unsplash
                </a>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="btn-ghost cursor-pointer text-xs">
                Replace
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setShowUnsplash((v) => !v)}
              >
                Search Unsplash
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                style={{ color: "var(--blue-link)" }}
                onClick={() => {
                  setImageUrl(null);
                  setImageCredit(null);
                  save({ image_url: null, image_credit: null });
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="btn-ghost cursor-pointer text-sm justify-center py-3" style={{ borderStyle: "dashed" }}>
                + Upload (≤ 2 MB)
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowUnsplash((v) => !v)}
                className="btn-ghost text-sm justify-center py-3"
                style={{ borderStyle: "dashed" }}
              >
                Search Unsplash
              </button>
            </div>
            <input
              placeholder="…or paste an image URL"
              className="input text-sm"
              onBlur={(e) => {
                const url = e.target.value.trim();
                if (url) {
                  setImageUrl(url);
                  setImageCredit(null);
                  save({ image_url: url, image_credit: null });
                  e.target.value = "";
                }
              }}
            />
          </div>
        )}
        {showUnsplash && (
          <UnsplashPicker
            onPick={(url, credit) => {
              setImageUrl(url);
              setImageCredit(credit);
              save({ image_url: url, image_credit: credit });
              setShowUnsplash(false);
            }}
            onClose={() => setShowUnsplash(false)}
          />
        )}
      </div>

      <div className="mt-4">
        {slide.type === "mcq" && (
          <>
            <McqConfig
              value={config as MCQConfig}
              onChange={(c) => setConfig(c)}
              onCommit={save}
            />
            <SuggestOptionsButton
              question={question}
              type="mcq"
              onResult={(opts) => {
                const next = { options: opts } as MCQConfig;
                setConfig(next);
                save({ config: next });
              }}
            />
          </>
        )}
        {slide.type === "quiz" && (
          <>
            <QuizConfigEditor
              value={config as QuizConfig}
              onChange={(c) => setConfig(c)}
              onCommit={save}
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={kahoot}
                onChange={(e) => {
                  setKahoot(e.target.checked);
                  save({ kahoot_mode: e.target.checked });
                }}
              />
              <span>Kahoot-style answer tiles (colored shapes on phones, podium at the end)</span>
            </label>
            <SuggestOptionsButton
              question={question}
              type="quiz"
              onResult={(opts, correct) => {
                const next: QuizConfig = {
                  options: opts,
                  correct_index: correct ?? 0,
                  time_limit_s: (config as QuizConfig).time_limit_s ?? 20,
                };
                setConfig(next);
                save({ config: next });
              }}
            />
          </>
        )}
        {slide.type === "embed" && (
          <EmbedConfigEditor
            value={config as EmbedConfig}
            onChange={(c) => setConfig(c)}
            onCommit={save}
          />
        )}
        {slide.type === "wordcloud" && (
          <WordCloudConfigEditor
            value={config as WordCloudConfig}
            onChange={(c) => setConfig(c)}
            onCommit={save}
          />
        )}
        {slide.type === "open" && (
          <p className="text-sm muted-text">No extra config — audience submits free text.</p>
        )}
        {slide.type === "qa" && (
          <QAConfigEditor
            value={config as QAConfig}
            onChange={(c) => setConfig(c)}
            onCommit={() => save()}
          />
        )}
        {slide.type === "rating" && (
          <RatingConfigEditor
            value={config as RatingConfig}
            onChange={(c) => setConfig(c)}
            onCommit={() => save()}
          />
        )}
        {slide.type === "ranking" && (
          <RankingConfigEditor
            value={config as RankingConfig}
            onChange={(c) => setConfig(c)}
            onCommit={() => save()}
          />
        )}
      </div>

      <div className="mt-3 text-[10px] uppercase tracking-[0.18em] muted-text h-4">
        {pending ? "Saving…" : savedAt ? "Saved" : ""}
      </div>
    </div>
  );
}

function McqConfig({
  value,
  onChange,
  onCommit,
}: {
  value: MCQConfig;
  onChange: (v: MCQConfig) => void;
  onCommit: () => void;
}) {
  const setOpt = (i: number, s: string) => {
    const next = [...value.options];
    next[i] = s;
    onChange({ ...value, options: next });
  };
  return (
    <div className="space-y-2">
      <span className="block text-xs muted-text">Options</span>
      {value.options.map((opt, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={opt}
            onChange={(e) => setOpt(i, e.target.value)}
            onBlur={() => onCommit()}
            className="input flex-1"
          />
          <button
            type="button"
            disabled={value.options.length <= 2}
            onClick={() => {
              const next = value.options.filter((_, j) => j !== i);
              onChange({ ...value, options: next });
              onCommit();
            }}
            className="btn-ghost text-sm muted-text disabled:opacity-40 px-3 py-2"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          onChange({ ...value, options: [...value.options, `Option ${value.options.length + 1}`] });
          onCommit();
        }}
        className="btn-ghost text-sm muted-text"
      >
        + Add option
      </button>

      <div className="mt-3 space-y-2 rounded-lg p-3" style={{ border: "1px solid var(--line)" }}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.multi ?? false}
            onChange={(e) => {
              onChange({ ...value, multi: e.target.checked, max_choices: e.target.checked ? value.max_choices ?? value.options.length : undefined });
              onCommit();
            }}
          />
          Allow multiple answers
        </label>
        {value.multi && (
          <label className="flex items-center gap-2 text-sm">
            <span className="muted-text">Max picks</span>
            <input
              type="number"
              min={1}
              max={value.options.length}
              value={value.max_choices ?? value.options.length}
              onChange={(e) => onChange({ ...value, max_choices: Math.max(1, Math.min(value.options.length, Number(e.target.value))) })}
              onBlur={onCommit}
              className="input w-20"
            />
          </label>
        )}
      </div>
    </div>
  );
}

function RankingConfigEditor({
  value,
  onChange,
  onCommit,
}: {
  value: RankingConfig;
  onChange: (v: RankingConfig) => void;
  onCommit: () => void;
}) {
  const items = value.items ?? [];
  return (
    <div className="space-y-2">
      <span className="block text-xs muted-text">Items to rank (audience drags into preferred order)</span>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange({ items: next });
            }}
            onBlur={onCommit}
            className="input flex-1"
          />
          <button
            type="button"
            disabled={items.length <= 2}
            onClick={() => {
              onChange({ items: items.filter((_, j) => j !== i) });
              onCommit();
            }}
            className="btn-ghost text-sm muted-text disabled:opacity-40 px-3 py-2"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          onChange({ items: [...items, `Item ${items.length + 1}`] });
          onCommit();
        }}
        className="btn-ghost text-sm muted-text"
      >
        + Add item
      </button>
    </div>
  );
}

function QuizConfigEditor({
  value,
  onChange,
  onCommit,
}: {
  value: QuizConfig;
  onChange: (v: QuizConfig) => void;
  onCommit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-2 block text-xs muted-text">Options · select correct answer</span>
        {value.options.map((opt, i) => (
          <div key={i} className="mt-2 flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${Math.random()}`}
              checked={value.correct_index === i}
              onChange={() => {
                onChange({ ...value, correct_index: i });
                onCommit();
              }}
            />
            <input
              value={opt}
              onChange={(e) => {
                const next = [...value.options];
                next[i] = e.target.value;
                onChange({ ...value, options: next });
              }}
              onBlur={() => onCommit()}
              className="input flex-1"
            />
            <button
              type="button"
              disabled={value.options.length <= 2}
              onClick={() => {
                const nextOpts = value.options.filter((_, j) => j !== i);
                const nextCorrect = Math.min(value.correct_index, nextOpts.length - 1);
                onChange({ ...value, options: nextOpts, correct_index: Math.max(0, nextCorrect) });
                onCommit();
              }}
              className="btn-ghost text-sm muted-text disabled:opacity-40 px-3 py-2"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            onChange({ ...value, options: [...value.options, `Option ${value.options.length + 1}`] });
            onCommit();
          }}
          className="btn-ghost mt-2 text-sm muted-text"
        >
          + Add option
        </button>
      </div>
      <label className="block">
        <span className="mb-2 block text-xs muted-text">Time limit (seconds)</span>
        <input
          type="number"
          min={5}
          max={120}
          value={value.time_limit_s}
          onChange={(e) => onChange({ ...value, time_limit_s: Number(e.target.value) })}
          onBlur={onCommit}
          className="input w-32"
        />
      </label>
    </div>
  );
}

function WordCloudConfigEditor({
  value,
  onChange,
  onCommit,
}: {
  value: WordCloudConfig;
  onChange: (v: WordCloudConfig) => void;
  onCommit: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs muted-text">Max words per participant</span>
      <input
        type="number"
        min={1}
        max={10}
        value={value.max_words_per_participant ?? 3}
        onChange={(e) => onChange({ max_words_per_participant: Number(e.target.value) })}
        onBlur={onCommit}
        className="input w-32"
      />
    </label>
  );
}

function QAConfigEditor({
  value,
  onChange,
  onCommit,
}: {
  value: QAConfig;
  onChange: (v: QAConfig) => void;
  onCommit: () => void;
}) {
  const moderation = value.moderation ?? "off";
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.upvotes ?? true}
          onChange={(e) => {
            onChange({ ...value, upvotes: e.target.checked });
            onCommit();
          }}
        />
        Allow upvotes — top questions float to the top
      </label>

      <div>
        <span className="mb-2 block text-xs muted-text">Moderation</span>
        <div className="flex flex-wrap gap-2">
          {([
            ["off", "Off", "All questions show immediately"],
            ["pre", "Approve first", "Questions wait for you to approve"],
            ["post", "Hide if needed", "Show all, but you can hide later"],
          ] as const).map(([k, label, hint]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange({ ...value, moderation: k });
                onCommit();
              }}
              className="btn-ghost text-sm"
              style={{
                background: moderation === k ? "rgba(0,113,227,0.12)" : undefined,
                borderColor: moderation === k ? "rgba(0,113,227,0.4)" : undefined,
                color: moderation === k ? "var(--blue)" : undefined,
              }}
              title={hint}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatingConfigEditor({
  value,
  onChange,
  onCommit,
}: {
  value: RatingConfig;
  onChange: (v: RatingConfig) => void;
  onCommit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-2 block text-xs muted-text">Scale</span>
        <div className="flex gap-2">
          {[5, 10].map((s) => (
            <button
              key={s}
              type="button"
              className={"btn-ghost text-sm " + (value.scale === s ? "!bg-[rgba(0,113,227,0.12)] !border-[rgba(0,113,227,0.4)]" : "")}
              onClick={() => {
                onChange({ ...value, scale: s as 5 | 10 });
                onCommit();
              }}
            >
              {s === 5 ? "1 – 5 stars" : "0 – 10 NPS"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs muted-text">Low label</span>
          <input
            value={value.min_label ?? ""}
            placeholder={value.scale === 5 ? "Poor" : "Not at all"}
            onChange={(e) => onChange({ ...value, min_label: e.target.value })}
            onBlur={onCommit}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs muted-text">High label</span>
          <input
            value={value.max_label ?? ""}
            placeholder={value.scale === 5 ? "Great" : "Extremely"}
            onChange={(e) => onChange({ ...value, max_label: e.target.value })}
            onBlur={onCommit}
            className="input"
          />
        </label>
      </div>
    </div>
  );
}

function labelFor(t: Slide["type"]) {
  return ({
    mcq: "Multiple choice",
    wordcloud: "Word cloud",
    open: "Open-ended",
    quiz: "Quiz",
    qa: "Q&A (upvoted)",
    rating: "Rating / NPS",
    ranking: "Ranking",
    embed: "Embedded slide",
  } as Record<Slide["type"], string>)[t];
}

function EmbedConfigEditor({
  value,
  onChange,
  onCommit,
}: {
  value: EmbedConfig;
  onChange: (v: EmbedConfig) => void;
  onCommit: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const ok = value.url ? isLikelyAllowed(value.url) : true;
  return (
    <div className="space-y-2">
      <label className="block text-xs muted-text">
        Public Google Slides or PowerPoint Web URL
      </label>
      <input
        value={value.url}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        onBlur={() => { setTouched(true); onCommit(); }}
        placeholder="https://docs.google.com/presentation/d/…/embed"
        className="input"
      />
      {!ok && touched && (
        <p className="text-xs" style={{ color: "#b91c1c" }}>
          Only Google Slides, PowerPoint Web, or Office.com URLs are allowed.
        </p>
      )}
      <p className="text-xs muted-text">
        For Google Slides: File → Share → Publish to web → Embed → copy the iframe URL.
      </p>
    </div>
  );
}

function isLikelyAllowed(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const allowed = ["docs.google.com", "drive.google.com", "onedrive.live.com", "office.com", "office.live.com", "1drv.ms"];
    return allowed.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function SuggestOptionsButton({
  question,
  type,
  onResult,
}: {
  question: string;
  type: "mcq" | "quiz";
  onResult: (options: string[], correctIndex?: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!question.trim()) {
      setError("Add a question first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/suggest-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, type, count: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI failed");
      onResult(data.options, data.correct_index);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!AI_ENABLED) return null;
  return (
    <div className="mt-3">
      <button onClick={go} disabled={busy} className="btn-ghost text-xs" style={{ color: "var(--blue)" }}>
        {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Suggesting…</> : <><Sparkles className="h-3 w-3" /> Suggest options with AI</>}
      </button>
      {error && <p className="mt-1 text-xs" style={{ color: "#b91c1c" }}>{error}</p>}
    </div>
  );
}
