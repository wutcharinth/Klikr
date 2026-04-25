"use client";

import { useState, useTransition } from "react";
import type { Slide, MCQConfig, QuizConfig, WordCloudConfig } from "@/lib/types";
import { updateSlide, deleteSlide } from "@/app/edit/[id]/actions";

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
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = () => {
    startTransition(async () => {
      await updateSlide(slide.id, presentationId, { question, config });
      setSavedAt(Date.now());
    });
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
          onBlur={save}
          placeholder="Type your question…"
          className="input"
        />
      </label>

      <div className="mt-4">
        {slide.type === "mcq" && (
          <McqConfig
            value={config as MCQConfig}
            onChange={(c) => setConfig(c)}
            onCommit={save}
          />
        )}
        {slide.type === "quiz" && (
          <QuizConfigEditor
            value={config as QuizConfig}
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
    onChange({ options: next });
  };
  return (
    <div className="space-y-2">
      <span className="block text-xs muted-text">Options</span>
      {value.options.map((opt, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={opt}
            onChange={(e) => setOpt(i, e.target.value)}
            onBlur={onCommit}
            className="input flex-1"
          />
          <button
            type="button"
            disabled={value.options.length <= 2}
            onClick={() => {
              const next = value.options.filter((_, j) => j !== i);
              onChange({ options: next });
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
          onChange({ options: [...value.options, `Option ${value.options.length + 1}`] });
          onCommit();
        }}
        className="btn-ghost text-sm muted-text"
      >
        + Add option
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
              onBlur={onCommit}
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

function labelFor(t: Slide["type"]) {
  return { mcq: "Multiple choice", wordcloud: "Word cloud", open: "Open-ended", quiz: "Quiz" }[t];
}
